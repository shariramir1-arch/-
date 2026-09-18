import { CONFIG } from './config.js';
import { normalizePhone } from './phone.js';

/**
 * שלב 2 בצינור — בדיקת תקינות.
 * פנייה שלא עוברת את הבדיקה מתויגת "לא רלוונטי" ומקבלת התראה קצרה למזכירה,
 * בלי מענה אוטומטי ללקוח.
 *
 * הערה: באינסטגרם אין טלפון ב-webhook. לכן טלפון נדרש רק בערוצים שבהם הוא
 * אמור להגיע (וואטסאפ/טופס); בליד מאינסטגרם הטלפון נאסף בשיחה הראשונה.
 */

export const REJECTION = {
  UNKNOWN_CHANNEL: 'unknown_channel',
  EMPTY_MESSAGE: 'empty_message',
  MISSING_PHONE: 'missing_phone',
  INVALID_PHONE: 'invalid_phone',
  SPAM: 'spam',
};

export const REJECTION_LABEL = {
  [REJECTION.UNKNOWN_CHANNEL]: 'מקור פנייה לא מזוהה',
  [REJECTION.EMPTY_MESSAGE]: 'פנייה ריקה',
  [REJECTION.MISSING_PHONE]: 'חסר טלפון',
  [REJECTION.INVALID_PHONE]: 'טלפון לא תקין',
  [REJECTION.SPAM]: 'ספאם',
};

export function isSpam(text = '') {
  return CONFIG.spamPatterns.some((pattern) => pattern.test(text));
}

/**
 * @param {import('./normalize.js').InboundLead} lead
 * @returns {{valid: boolean, reasons: string[], labels: string[]}}
 */
export function validateInbound(lead) {
  const reasons = [];

  if (!CONFIG.channels.includes(lead?.channel)) {
    reasons.push(REJECTION.UNKNOWN_CHANNEL);
  }

  const text = String(lead?.messageText ?? '').trim();
  if (text.length < CONFIG.minMessageLength && !lead?.treatmentHint) {
    reasons.push(REJECTION.EMPTY_MESSAGE);
  }

  if (isSpam(text)) {
    reasons.push(REJECTION.SPAM);
  }

  const phoneRaw = String(lead?.phoneRaw ?? '').trim();
  if (phoneRaw) {
    if (!normalizePhone(phoneRaw).ok) reasons.push(REJECTION.INVALID_PHONE);
  } else if (CONFIG.phoneRequiredChannels.includes(lead?.channel)) {
    reasons.push(REJECTION.MISSING_PHONE);
  }

  return {
    valid: reasons.length === 0,
    reasons,
    labels: reasons.map((reason) => REJECTION_LABEL[reason] ?? reason),
  };
}
