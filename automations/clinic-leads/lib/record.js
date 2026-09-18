import { CONFIG } from './config.js';
import { STATUS } from './statuses.js';

/**
 * מבנה הרשומה בגיליון/CRM ותרגום בין רשומה לשורה.
 * סדר העמודות כאן הוא סדר העמודות בגיליון — אל תשנו אחד בלי השני.
 */

export const COLUMNS = [
  { key: 'leadKey', header: 'מפתח ליד' },
  { key: 'fullName', header: 'שם מלא' },
  { key: 'phone', header: 'טלפון' },
  { key: 'source', header: 'מקור הפנייה' },
  { key: 'requestedTreatment', header: 'טיפול מבוקש' },
  { key: 'originalMessage', header: 'תוכן הפנייה המקורי' },
  { key: 'receivedAt', header: 'תאריך ושעת פנייה' },
  { key: 'status', header: 'סטטוס' },
  { key: 'nextFollowupAt', header: 'מועד מעקב הבא' },
  { key: 'followupAttempts', header: 'ניסיונות מעקב' },
  { key: 'owner', header: 'מי מטפל' },
  { key: 'appointmentAt', header: 'תאריך תור' },
  { key: 'notes', header: 'הערות' },
  { key: 'updatedAt', header: 'עדכון אחרון' },
  // עמודות תפעוליות שהאוטומציה צריכה ואינן חלק מהמינימום שהוגדר
  { key: 'urgency', header: 'דחיפות' },
  { key: 'escalationReasons', header: 'סיבות הסלמה' },
  { key: 'confidence', header: 'ביטחון סיווג' },
  { key: 'channelHandle', header: 'מזהה בערוץ' },
  { key: 'lastExternalId', header: 'מזהה הודעה אחרונה' },
  { key: 'problematicHistory', header: 'היסטוריה בעייתית' },
  { key: 'appointmentReminderAt', header: 'מועד תזכורת תור' },
  { key: 'appointmentReminderSent', header: 'תזכורת תור נשלחה' },
];

export const HEADERS = COLUMNS.map((column) => column.header);

export const OWNER = { AI: 'AI', SECRETARY: 'מזכירה' };

/** מפתח ייחודי לליד. טלפון כשיש; באינסטגרם לפני איסוף טלפון — מזהה השולח. */
export function leadKey(lead) {
  if (lead?.phone) return lead.phone;
  if (lead?.senderHandle) return `${lead.channel}:${lead.senderHandle}`;
  return null;
}

export function addHours(isoString, hours) {
  return new Date(new Date(isoString).getTime() + hours * 3600 * 1000).toISOString();
}

/** הוספת שורה להערות בלי לדרוס את מה שהיה. */
export function appendNote(existingNotes, entry, at) {
  const stamp = new Intl.DateTimeFormat('he-IL', {
    timeZone: CONFIG.timezone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(at));
  const line = `[${stamp}] ${entry}`;
  const previous = String(existingNotes ?? '').trim();
  return previous ? `${previous}\n${line}` : line;
}

/**
 * בניית רשומה חדשה מליד מנורמל + סיווג.
 * @returns {Object} רשומה מוכנה לכתיבה לגיליון
 */
export function buildLeadRecord(lead, classification, now) {
  const createdAt = now ?? new Date().toISOString();
  const requiresHuman = classification.requiresHuman;

  return {
    leadKey: leadKey(lead),
    fullName: lead.fullName || 'ללא שם',
    phone: lead.phone ?? '',
    source: lead.channelLabel ?? CONFIG.channelLabels[lead.channel] ?? lead.channel,
    requestedTreatment: classification.requestedTreatment,
    originalMessage: lead.messageText ?? '',
    receivedAt: lead.receivedAt ?? createdAt,
    status: STATUS.NEW,
    nextFollowupAt: addHours(createdAt, CONFIG.followupHours),
    followupAttempts: 0,
    owner: requiresHuman ? OWNER.SECRETARY : OWNER.AI,
    appointmentAt: '',
    notes: appendNote('', `נקלט מ${lead.channelLabel ?? lead.channel}: ${classification.summary}`, createdAt),
    updatedAt: createdAt,
    urgency: classification.urgency,
    escalationReasons: (classification.escalationReasons ?? []).join(','),
    confidence: classification.confidence,
    channelHandle: lead.senderHandle ?? '',
    lastExternalId: lead.externalId ?? '',
    problematicHistory: false,
    appointmentReminderAt: '',
    appointmentReminderSent: false,
  };
}

export function toSheetRow(record) {
  return COLUMNS.map(({ key }) => {
    const value = record[key];
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    return String(value);
  });
}

export function fromSheetRow(row) {
  const record = {};
  COLUMNS.forEach(({ key }, index) => {
    record[key] = row?.[index] ?? '';
  });
  record.followupAttempts = Number(record.followupAttempts) || 0;
  record.confidence = Number(record.confidence) || 0;
  record.problematicHistory = String(record.problematicHistory).toUpperCase() === 'TRUE';
  record.appointmentReminderSent = String(record.appointmentReminderSent).toUpperCase() === 'TRUE';
  return record;
}

/** המרה מאובייקט בשם-עמודה (כפי שנוד Google Sheets ב-n8n מחזיר) לרשומה. */
export function fromSheetObject(object = {}) {
  const record = {};
  for (const { key, header } of COLUMNS) {
    record[key] = object[header] ?? object[key] ?? '';
  }
  record.followupAttempts = Number(record.followupAttempts) || 0;
  record.confidence = Number(record.confidence) || 0;
  record.problematicHistory = String(record.problematicHistory).toUpperCase() === 'TRUE';
  record.appointmentReminderSent = String(record.appointmentReminderSent).toUpperCase() === 'TRUE';
  return record;
}

/** המרה חזרה למפתחות בעברית לכתיבה לגיליון. */
export function toSheetObject(record) {
  const object = {};
  for (const { key, header } of COLUMNS) {
    if (record[key] === undefined) continue;
    const value = record[key];
    object[header] = typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : value ?? '';
  }
  return object;
}
