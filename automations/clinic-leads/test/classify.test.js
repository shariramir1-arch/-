import test from 'node:test';
import assert from 'node:assert/strict';
import { ESCALATION_REASON } from '../lib/config.js';
import { buildClassifierPrompt, parseClassifierOutput, resolveClassification } from '../lib/classify.js';

const lead = (messageText, extra = {}) => ({ messageText, channel: 'whatsapp', channelLabel: 'וואטסאפ', fullName: 'דנה', ...extra });
const ok = (extra = {}) => JSON.stringify({
  requestedTreatment: 'בוטוקס', urgency: 'בינונית', requiresHuman: false,
  escalationReasons: [], summary: 'מתעניינת בבוטוקס', confidence: 0.92, ...extra,
});

test('סיווג תקין עובר בלי הסלמה', () => {
  const result = resolveClassification(ok(), lead('היי, מעוניינת בבוטוקס למצח'));
  assert.equal(result.requiresHuman, false);
  assert.deepEqual(result.escalationReasons, []);
  assert.equal(result.requestedTreatment, 'בוטוקס');
});

test('שאלה רפואית מסלימה גם כשהמודל אומר שהכול תקין', () => {
  for (const text of ['אני בהריון, מתאים לי?', 'אני לוקחת תרופות לדם', 'יש תופעות לוואי?', 'האם מותר אחרי לידה?']) {
    const result = resolveClassification(ok(), lead(text));
    assert.equal(result.requiresHuman, true, text);
    assert.ok(result.escalationReasons.includes(ESCALATION_REASON.MEDICAL), text);
  }
});

test('תלונה, הנחה וביטול מסלימים', () => {
  assert.ok(resolveClassification(ok(), lead('לא הייתי מרוצה מהטיפול הקודם')).escalationReasons.includes(ESCALATION_REASON.COMPLAINT));
  assert.ok(resolveClassification(ok(), lead('אפשר הנחה?')).escalationReasons.includes(ESCALATION_REASON.PRICE_NEGOTIATION));
  assert.ok(resolveClassification(ok(), lead('אני רוצה לבטל ולקבל החזר כספי')).escalationReasons.includes(ESCALATION_REASON.CANCELLATION_REFUND));
});

test('שאלת מחיר רגילה לא מסלימה אבל מסומנת', () => {
  const result = resolveClassification(ok(), lead('כמה עולה טיפול פנים?'));
  assert.equal(result.mentionsPrice, true);
  assert.equal(result.requiresHuman, false);
});

test('ביטחון נמוך או פלט לא תקין מעבירים לאדם', () => {
  const lowConfidence = resolveClassification(ok({ confidence: 0.4 }), lead('היי'));
  assert.ok(lowConfidence.escalationReasons.includes(ESCALATION_REASON.LOW_CONFIDENCE));

  const broken = resolveClassification('המודל החזיר טקסט חופשי', lead('היי'));
  assert.equal(broken.aiFailed, true);
  assert.equal(broken.requiresHuman, true);
  assert.equal(broken.confidence, 0);
});

test('היסטוריה בעייתית ברשומה מסלימה', () => {
  const result = resolveClassification(ok(), lead('היי'), { problematicHistory: true });
  assert.ok(result.escalationReasons.includes(ESCALATION_REASON.PROBLEMATIC_HISTORY));
});

test('טיפול לא מוכר נופל ל"אחר"', () => {
  const result = resolveClassification(ok({ requestedTreatment: 'טיפול שלא קיים ברשימה' }), lead('היי'));
  assert.equal(result.requestedTreatment, 'אחר');
});

test('מפענח JSON גם בתוך סימוני קוד', () => {
  assert.deepEqual(parseClassifierOutput('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseClassifierOutput('בבקשה: {"a":1} תודה'), { a: 1 });
  assert.equal(parseClassifierOutput('לא JSON'), null);
});

test('הפרומפט כולל את תוכן הפנייה ואת הערכים המותרים', () => {
  const prompt = buildClassifierPrompt(lead('מעוניינת בלייזר', { treatmentHint: 'לייזר להסרת שיער' }), { isReturning: true });
  assert.match(prompt.user, /מעוניינת בלייזר/);
  assert.match(prompt.user, /לייזר להסרת שיער/);
  assert.match(prompt.user, /ליד קיים שפנה שוב/);
  assert.match(prompt.system, /אינך נוקב במחירים/);
  assert.equal(prompt.schema.required.includes('confidence'), true);
});
