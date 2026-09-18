import { CONFIG } from './config.js';
import { STATUS, canTransition } from './statuses.js';
import { normalizeInbound } from './normalize.js';
import { validateInbound } from './validate.js';
import { resolveClassification } from './classify.js';
import { OWNER, addHours, appendNote, buildLeadRecord, leadKey } from './record.js';
import * as messages from './messages.js';

/**
 * שלבים 1–7 בצינור, כפונקציה טהורה אחת.
 * הפונקציה לא מדברת עם אף שירות — היא מקבלת מצב ומחזירה רשימת פעולות,
 * ו-n8n/Make מבצע אותן. כך אפשר לבדוק את כל ההיגיון בלי webhooks.
 */

export const ACTION = {
  CREATE_RECORD: 'create_record',
  UPDATE_RECORD: 'update_record',
  SEND_MESSAGE: 'send_message',
  NOTIFY_STAFF: 'notify_staff',
};

export const OUTCOME = {
  INVALID: 'invalid',
  DUPLICATE_WEBHOOK: 'duplicate_webhook',
  EXISTING_UPDATED: 'existing_updated',
  CREATED: 'created',
};

const sendMessage = (lead, text, kind) => ({
  type: ACTION.SEND_MESSAGE,
  kind,
  channel: lead.replyTo?.channel ?? lead.channel,
  to: lead.replyTo?.address ?? lead.phone ?? null,
  text,
});

const notify = (text, severity = 'info') => ({ type: ACTION.NOTIFY_STAFF, severity, text });

/**
 * @param {Object} input
 * @param {Object} input.payload  גוף ה-webhook הגולמי
 * @param {string} [input.source]  דריסת זיהוי המקור
 * @param {Object|null} [input.existingRecord]  הרשומה הקיימת לאותו מפתח, אם נמצאה
 * @param {Object|string|null} [input.aiOutput]  פלט הסיווג של המודל
 * @param {string} [input.now]  ISO — מוזרק בבדיקות
 * @param {string} [input.sheetUrl]  קישור לשורה, נכנס להתראות
 */
export function processInbound({ payload, source, existingRecord = null, aiOutput = null, now, sheetUrl } = {}) {
  const at = now ?? new Date().toISOString();
  const lead = normalizeInbound(payload, { source, now: at });
  const validation = validateInbound(lead);
  const key = leadKey(lead);

  // webhook שנשלח פעמיים — אותו מזהה הודעה, לא עושים כלום
  if (lead.externalId && existingRecord && existingRecord.lastExternalId === lead.externalId) {
    return { outcome: OUTCOME.DUPLICATE_WEBHOOK, lead, validation, actions: [] };
  }

  if (!validation.valid) {
    const actions = [];
    const summary = validation.labels.join(', ');

    if (existingRecord) {
      actions.push({
        type: ACTION.UPDATE_RECORD,
        key: existingRecord.leadKey ?? key,
        updates: {
          notes: appendNote(existingRecord.notes, `פנייה שנפסלה (${summary}): ${lead.messageText}`, at),
          lastExternalId: lead.externalId ?? existingRecord.lastExternalId ?? '',
          updatedAt: at,
        },
      });
    } else if (key) {
      const record = buildLeadRecord(lead, {
        requestedTreatment: 'אחר',
        urgency: 'נמוכה',
        escalationReasons: [],
        requiresHuman: false,
        confidence: 0,
        summary: `פנייה שנפסלה: ${summary}`,
      }, at);
      record.status = STATUS.IRRELEVANT;
      record.owner = OWNER.SECRETARY;
      record.nextFollowupAt = '';
      actions.push({ type: ACTION.CREATE_RECORD, record });
    }

    // אין מענה אוטומטי לפנייה שנפסלה — רק התראה קצרה
    actions.push(notify(messages.invalidLeadAlert(lead, validation.labels, sheetUrl), 'warning'));
    return { outcome: OUTCOME.INVALID, lead, validation, actions };
  }

  const classification = resolveClassification(aiOutput, lead, {
    problematicHistory: Boolean(existingRecord?.problematicHistory),
  });

  return existingRecord
    ? updateExisting({ lead, existingRecord, classification, at, sheetUrl, validation })
    : createNew({ lead, classification, at, sheetUrl, validation });
}

function createNew({ lead, classification, at, sheetUrl, validation }) {
  const record = buildLeadRecord(lead, classification, at);
  const actions = [{ type: ACTION.CREATE_RECORD, record }];

  const alertLead = {
    ...record,
    channel: lead.channel,
    sourceLabel: record.source,
    escalationReasons: classification.escalationReasons,
    originalMessage: lead.messageText,
  };

  if (classification.requiresHuman) {
    // ה-AI לא עונה לגופו של עניין — רק מודיע שמישהו יחזור
    actions.push(sendMessage(lead, messages.handoffToHuman(), 'handoff'));
    actions.push({
      type: ACTION.UPDATE_RECORD,
      key: record.leadKey,
      updates: {
        status: STATUS.HANDED_TO_HUMAN,
        owner: OWNER.SECRETARY,
        nextFollowupAt: '',
        updatedAt: at,
      },
    });
    actions.push(notify(messages.handoffAlert(alertLead, sheetUrl), 'critical'));
    return { outcome: OUTCOME.CREATED, lead, classification, validation, record, actions };
  }

  actions.push(sendMessage(lead, messages.greeting({ ...lead, requestedTreatment: classification.requestedTreatment }), 'greeting'));
  actions.push({
    type: ACTION.UPDATE_RECORD,
    key: record.leadKey,
    updates: { status: STATUS.CONTACTED, updatedAt: at },
  });

  const priceNote = classification.mentionsPrice ? '\n(הלקוח שאל על מחיר — ה-AI לא נוקב במחירים)' : '';
  actions.push(notify(messages.newLeadAlert(alertLead, sheetUrl) + priceNote, 'info'));

  return { outcome: OUTCOME.CREATED, lead, classification, validation, record, actions };
}

function updateExisting({ lead, existingRecord, classification, at, sheetUrl, validation }) {
  const updates = {
    notes: appendNote(existingRecord.notes, `פנייה חוזרת מ${lead.channelLabel}: ${lead.messageText}`, at),
    lastExternalId: lead.externalId ?? existingRecord.lastExternalId ?? '',
    updatedAt: at,
  };

  // טלפון שהגיע רק עכשיו (למשל ליד מאינסטגרם שהשאיר מספר) משלים את הרשומה
  if (!existingRecord.phone && lead.phone) updates.phone = lead.phone;
  if ((!existingRecord.fullName || existingRecord.fullName === 'ללא שם') && lead.fullName !== 'ללא שם') {
    updates.fullName = lead.fullName;
  }

  const actions = [];
  const alertLead = {
    ...existingRecord,
    ...updates,
    channel: lead.channel,
    sourceLabel: existingRecord.source,
    requestedTreatment: existingRecord.requestedTreatment || classification.requestedTreatment,
    escalationReasons: classification.escalationReasons,
    originalMessage: lead.messageText,
  };

  if (classification.requiresHuman && existingRecord.status !== STATUS.HANDED_TO_HUMAN) {
    if (canTransition(existingRecord.status, STATUS.HANDED_TO_HUMAN)) {
      updates.status = STATUS.HANDED_TO_HUMAN;
      updates.owner = OWNER.SECRETARY;
      updates.nextFollowupAt = '';
      updates.escalationReasons = classification.escalationReasons.join(',');
    }
    actions.push({ type: ACTION.UPDATE_RECORD, key: existingRecord.leadKey, updates });
    actions.push(sendMessage(lead, messages.handoffToHuman(), 'handoff'));
    actions.push(notify(messages.handoffAlert(alertLead, sheetUrl), 'critical'));
    return { outcome: OUTCOME.EXISTING_UPDATED, lead, classification, validation, updates, actions };
  }

  // הלקוח הגיב — המעקב מתאפס, אבל לא נשלחת שוב הודעת פתיחה
  const reopenable = [STATUS.AWAITING_REPLY, STATUS.IRRELEVANT];
  if (reopenable.includes(existingRecord.status) && canTransition(existingRecord.status, STATUS.CONTACTED)) {
    updates.status = STATUS.CONTACTED;
    updates.followupAttempts = 0;
    updates.nextFollowupAt = addHours(at, CONFIG.followupHours);
  }

  actions.push({ type: ACTION.UPDATE_RECORD, key: existingRecord.leadKey, updates });
  actions.push(notify(messages.returningLeadAlert(alertLead, sheetUrl), 'info'));

  return { outcome: OUTCOME.EXISTING_UPDATED, lead, classification, validation, updates, actions };
}
