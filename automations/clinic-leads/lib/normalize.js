import { CONFIG } from './config.js';
import { normalizePhone } from './phone.js';

/**
 * שלב 1 בצינור — קליטה.
 * שלושת המקורות מגיעים במבנים שונים לחלוטין; כאן הם הופכים למבנה אחיד אחד
 * שכל שאר השלבים מכירים.
 *
 * @typedef {Object} InboundLead
 * @property {'whatsapp'|'instagram'|'form'} channel
 * @property {string} channelLabel  תווית המקור בגיליון
 * @property {string|null} externalId  מזהה ההודעה במקור — לחסימת כפילויות webhook
 * @property {string} fullName
 * @property {string|null} phone  מנורמל ל-E.164, null אם אין/לא תקין
 * @property {string} phoneRaw
 * @property {string} messageText  תוכן הפנייה המקורי
 * @property {string|null} treatmentHint  טיפול שנבחר מראש (טופס בלבד)
 * @property {string} receivedAt  ISO-8601
 * @property {string|null} senderHandle  מזהה לתשובה בערוץ (IGSID / שם משתמש)
 * @property {{channel: string, address: string|null}} replyTo
 * @property {Object} raw
 */

function iso(value, fallbackNow) {
  const now = fallbackNow ? new Date(fallbackNow) : new Date();
  if (value === null || value === undefined || value === '') return now.toISOString();
  // חותמות של מטא/טוויליו מגיעות בשניות, לפעמים כמחרוזת
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    const ms = numeric > 1e11 ? numeric : numeric * 1000;
    return new Date(ms).toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? now.toISOString() : parsed.toISOString();
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/** זיהוי המקור לפי מבנה ה-payload, כדי ש-webhook אחד יוכל לשרת את שלושתם. */
export function detectSource(payload = {}) {
  if (payload.object === 'whatsapp_business_account') return 'meta_whatsapp';
  if (payload.object === 'instagram' || payload.object === 'page') return 'meta_instagram';
  if (payload.MessageSid || payload.SmsMessageSid) return 'twilio_whatsapp';
  if (payload.source === 'form' || payload.formId || payload.form_id) return 'form';
  if (payload.channel && CONFIG.channels.includes(payload.channel)) return 'generic';
  return 'unknown';
}

function fromMetaWhatsapp(payload, options) {
  const value = payload?.entry?.[0]?.changes?.[0]?.value ?? {};
  const message = value.messages?.[0] ?? {};
  const contact = value.contacts?.[0] ?? {};
  const text =
    message.text?.body ??
    message.button?.text ??
    message.interactive?.list_reply?.title ??
    message.interactive?.button_reply?.title ??
    '';
  return {
    channel: 'whatsapp',
    externalId: message.id ?? null,
    fullName: clean(contact.profile?.name),
    phoneRaw: clean(message.from ?? contact.wa_id),
    messageText: clean(text),
    treatmentHint: null,
    receivedAt: iso(message.timestamp, options.now),
    senderHandle: message.from ?? null,
  };
}

function fromTwilioWhatsapp(payload, options) {
  return {
    channel: 'whatsapp',
    externalId: payload.MessageSid ?? payload.SmsMessageSid ?? null,
    fullName: clean(payload.ProfileName),
    phoneRaw: clean(String(payload.From ?? '').replace(/^whatsapp:/, '')),
    messageText: clean(payload.Body),
    treatmentHint: null,
    receivedAt: iso(payload.Timestamp ?? payload.DateSent, options.now),
    senderHandle: clean(String(payload.From ?? '')) || null,
  };
}

function fromMetaInstagram(payload, options) {
  const entry = payload?.entry?.[0] ?? {};
  const messaging = entry.messaging?.[0];

  if (messaging) {
    // הודעה פרטית (DM)
    return {
      channel: 'instagram',
      externalId: messaging.message?.mid ?? null,
      fullName: clean(messaging.sender?.username),
      phoneRaw: '',
      messageText: clean(messaging.message?.text),
      treatmentHint: null,
      receivedAt: iso(messaging.timestamp ?? entry.time, options.now),
      senderHandle: messaging.sender?.id ?? messaging.sender?.username ?? null,
    };
  }

  // תגובה לפוסט
  const comment = entry.changes?.[0]?.value ?? {};
  return {
    channel: 'instagram',
    externalId: comment.id ?? null,
    fullName: clean(comment.from?.username ?? comment.username),
    phoneRaw: '',
    messageText: clean(comment.text),
    treatmentHint: null,
    receivedAt: iso(comment.timestamp ?? entry.time, options.now),
    senderHandle: comment.from?.id ?? comment.from?.username ?? comment.username ?? null,
  };
}

function fromForm(payload, options) {
  return {
    channel: 'form',
    externalId: clean(payload.submissionId ?? payload.submission_id ?? payload.id) || null,
    fullName: clean(payload.name ?? payload.fullName ?? payload.full_name),
    phoneRaw: clean(payload.phone ?? payload.tel ?? payload.mobile),
    messageText: clean(payload.message ?? payload.notes ?? payload.text),
    treatmentHint: clean(payload.treatment ?? payload.interest ?? payload.service) || null,
    receivedAt: iso(payload.submittedAt ?? payload.submitted_at ?? payload.createdAt, options.now),
    senderHandle: clean(payload.email) || null,
  };
}

function fromGeneric(payload, options) {
  return {
    channel: payload.channel,
    externalId: clean(payload.externalId) || null,
    fullName: clean(payload.fullName ?? payload.name),
    phoneRaw: clean(payload.phone),
    messageText: clean(payload.messageText ?? payload.message),
    treatmentHint: clean(payload.treatment) || null,
    receivedAt: iso(payload.receivedAt, options.now),
    senderHandle: clean(payload.senderHandle) || null,
  };
}

const PARSERS = {
  meta_whatsapp: fromMetaWhatsapp,
  twilio_whatsapp: fromTwilioWhatsapp,
  meta_instagram: fromMetaInstagram,
  form: fromForm,
  generic: fromGeneric,
};

/**
 * לאן נשלחת התשובה.
 * באינסטגרם אין טלפון — עונים דרך מזהה השולח. בטופס אין ערוץ לענות בו,
 * ולכן התשובה יוצאת בוואטסאפ לטלפון שנמסר, ובאימייל אם אין טלפון.
 */
function replyRoute(parsed, phoneResult) {
  const phone = phoneResult.ok ? phoneResult.e164 : null;
  if (parsed.channel === 'instagram') return { channel: 'instagram', address: parsed.senderHandle ?? null };
  if (parsed.channel === 'form') {
    return phone
      ? { channel: 'whatsapp', address: phone }
      : { channel: 'email', address: parsed.senderHandle ?? null };
  }
  return { channel: parsed.channel, address: phone };
}

/**
 * @param {Object} payload  גוף ה-webhook הגולמי
 * @param {{source?: string, now?: string}} [options]
 * @returns {InboundLead}
 */
export function normalizeInbound(payload = {}, options = {}) {
  const source = options.source ?? detectSource(payload);
  const parse = PARSERS[source];

  if (!parse) {
    return {
      channel: 'unknown',
      channelLabel: 'לא ידוע',
      externalId: null,
      fullName: '',
      phone: null,
      phoneRaw: '',
      messageText: '',
      treatmentHint: null,
      receivedAt: iso(null, options.now),
      senderHandle: null,
      replyTo: { channel: 'unknown', address: null },
      source,
      raw: payload,
    };
  }

  const parsed = parse(payload, options);
  const phoneResult = normalizePhone(parsed.phoneRaw);

  return {
    ...parsed,
    fullName: parsed.fullName || 'ללא שם',
    phone: phoneResult.ok ? phoneResult.e164 : null,
    channelLabel: CONFIG.channelLabels[parsed.channel] ?? parsed.channel,
    replyTo: replyRoute(parsed, phoneResult),
    source,
    raw: payload,
  };
}
