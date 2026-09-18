import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTION, OUTCOME, processInbound } from '../lib/pipeline.js';
import { STATUS } from '../lib/statuses.js';

const NOW = '2026-09-18T09:00:00.000Z';
const AI_OK = JSON.stringify({
  requestedTreatment: 'בוטוקס', urgency: 'בינונית', requiresHuman: false,
  escalationReasons: [], summary: 'מתעניינת בבוטוקס', confidence: 0.9,
});

const whatsapp = (body, id = 'wamid.1') => ({
  object: 'whatsapp_business_account',
  entry: [{ changes: [{ value: {
    contacts: [{ profile: { name: 'דנה לוי' }, wa_id: '972501234567' }],
    messages: [{ from: '972501234567', id, timestamp: '1758186000', text: { body } }],
  } }] }],
});

const actionsOfType = (result, type) => result.actions.filter((action) => action.type === type);
const firstOfType = (result, type) => actionsOfType(result, type)[0];

test('ליד חדש: נוצרת רשומה, נשלחת פתיחה, הסטטוס עובר ל"נוצר קשר", המזכירה מקבלת התראה', () => {
  const result = processInbound({ payload: whatsapp('היי, מעוניינת בבוטוקס'), aiOutput: AI_OK, now: NOW, sheetUrl: 'https://sheet/#row=2' });

  assert.equal(result.outcome, OUTCOME.CREATED);
  const created = firstOfType(result, ACTION.CREATE_RECORD).record;
  assert.equal(created.leadKey, '+972501234567');
  assert.equal(created.status, STATUS.NEW);
  assert.equal(created.owner, 'AI');
  assert.equal(created.followupAttempts, 0);
  assert.equal(created.nextFollowupAt, '2026-09-19T09:00:00.000Z');

  const greeting = firstOfType(result, ACTION.SEND_MESSAGE);
  assert.equal(greeting.kind, 'greeting');
  assert.equal(greeting.channel, 'whatsapp');
  assert.equal(greeting.to, '+972501234567');
  assert.doesNotMatch(greeting.text, /₪|מחיר|שקל/);

  assert.equal(firstOfType(result, ACTION.UPDATE_RECORD).updates.status, STATUS.CONTACTED);
  assert.match(firstOfType(result, ACTION.NOTIFY_STAFF).text, /ליד חדש/);
});

test('שאלה רפואית: אין מענה לגופו של עניין, הסטטוס "הועבר לאדם", התראה מיידית', () => {
  const result = processInbound({ payload: whatsapp('אני בהריון, מתאים לי בוטוקס?'), aiOutput: AI_OK, now: NOW });

  const reply = firstOfType(result, ACTION.SEND_MESSAGE);
  assert.equal(reply.kind, 'handoff');
  assert.equal(reply.text, 'תודה על הפנייה 🙏 מישהו מהצוות יחזור אליך בהקדם.');

  const update = firstOfType(result, ACTION.UPDATE_RECORD);
  assert.equal(update.updates.status, STATUS.HANDED_TO_HUMAN);
  assert.equal(update.updates.owner, 'מזכירה');
  assert.equal(update.updates.nextFollowupAt, '');

  const alert = firstOfType(result, ACTION.NOTIFY_STAFF);
  assert.equal(alert.severity, 'critical');
  assert.match(alert.text, /שאלה רפואית/);
});

test('כפילות לפי טלפון: מתעדכנת הרשומה הקיימת, בלי ליד חדש ובלי הודעת פתיחה נוספת', () => {
  const existing = {
    leadKey: '+972501234567', fullName: 'דנה לוי', phone: '+972501234567', source: 'וואטסאפ',
    status: STATUS.AWAITING_REPLY, followupAttempts: 1, notes: '[17.9] נקלט', requestedTreatment: 'בוטוקס',
    nextFollowupAt: '2026-09-19T09:00:00.000Z', lastExternalId: 'wamid.0',
  };
  const result = processInbound({ payload: whatsapp('סליחה על העיכוב, עדיין מעוניינת', 'wamid.2'), existingRecord: existing, aiOutput: AI_OK, now: NOW });

  assert.equal(result.outcome, OUTCOME.EXISTING_UPDATED);
  assert.equal(actionsOfType(result, ACTION.CREATE_RECORD).length, 0);
  assert.equal(actionsOfType(result, ACTION.SEND_MESSAGE).length, 0);

  const updates = firstOfType(result, ACTION.UPDATE_RECORD).updates;
  assert.match(updates.notes, /\[17\.9\] נקלט/);
  assert.match(updates.notes, /עדיין מעוניינת/);
  // הלקוחה הגיבה — המעקב מתאפס
  assert.equal(updates.status, STATUS.CONTACTED);
  assert.equal(updates.followupAttempts, 0);
  assert.equal(updates.nextFollowupAt, '2026-09-19T09:00:00.000Z');
});

test('ליד שנסגר ופנה שוב נפתח מחדש', () => {
  const existing = { leadKey: '+972501234567', status: STATUS.IRRELEVANT, followupAttempts: 2, notes: '', phone: '+972501234567', source: 'וואטסאפ' };
  const result = processInbound({ payload: whatsapp('חזרתי, אפשר לתאם?', 'wamid.9'), existingRecord: existing, aiOutput: AI_OK, now: NOW });
  assert.equal(firstOfType(result, ACTION.UPDATE_RECORD).updates.status, STATUS.CONTACTED);
});

test('אותו webhook פעמיים לא מייצר שום פעולה', () => {
  const existing = { leadKey: '+972501234567', status: STATUS.CONTACTED, lastExternalId: 'wamid.1', notes: '' };
  const result = processInbound({ payload: whatsapp('היי', 'wamid.1'), existingRecord: existing, aiOutput: AI_OK, now: NOW });
  assert.equal(result.outcome, OUTCOME.DUPLICATE_WEBHOOK);
  assert.deepEqual(result.actions, []);
});

test('פנייה לא תקינה מתויגת "לא רלוונטי" בלי מענה ללקוח', () => {
  const spam = { source: 'form', name: 'bot', phone: '0501234567', message: 'best seo services and backlinks', submissionId: 's1' };
  const result = processInbound({ payload: spam, aiOutput: AI_OK, now: NOW });

  assert.equal(result.outcome, OUTCOME.INVALID);
  assert.equal(actionsOfType(result, ACTION.SEND_MESSAGE).length, 0);
  assert.equal(firstOfType(result, ACTION.CREATE_RECORD).record.status, STATUS.IRRELEVANT);
  assert.match(firstOfType(result, ACTION.NOTIFY_STAFF).text, /ספאם/);
});

test('טופס בלי טלפון נפסל, ליד מאינסטגרם בלי טלפון ממשיך', () => {
  const noPhone = processInbound({ payload: { source: 'form', name: 'x', message: 'אשמח לפרטים' }, aiOutput: AI_OK, now: NOW });
  assert.equal(noPhone.outcome, OUTCOME.INVALID);
  assert.match(noPhone.validation.labels.join(), /חסר טלפון/);

  const instagram = processInbound({
    payload: { object: 'instagram', entry: [{ messaging: [{ sender: { id: '17841' }, message: { mid: 'm1', text: 'אשמח לפרטים על לייזר' }, timestamp: 1758186000000 }] }] },
    aiOutput: AI_OK, now: NOW,
  });
  assert.equal(instagram.outcome, OUTCOME.CREATED);
  assert.equal(firstOfType(instagram, ACTION.CREATE_RECORD).record.leadKey, 'instagram:17841');
  assert.match(firstOfType(instagram, ACTION.SEND_MESSAGE).text, /מספר טלפון/);
});
