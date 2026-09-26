import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { REDACTED, buildReport, viewInteractions, viewLead } from './access.ts';
import type { Classifier } from './classifier.ts';
import { parseClassification } from './classifier.ts';
import type { EngineConfig } from './engine.ts';
import { LeadsEngine } from './engine.ts';
import { AuditLog, FixedClock, MemoryInteractions, MemoryLeads, RecordingMessenger, RecordingNotifier } from './memory.ts';
import { normalizePhone } from './normalize.ts';
import { decideEscalation, isOptOut } from './rules.ts';
import type { Classification } from './schema.ts';

const TREATMENTS = ['הסרת שיער', 'בוטוקס', 'פילינג'] as const;

const ok = (over: Partial<Classification> = {}): Classification => ({
  treatment: 'הסרת שיער',
  urgency: 'בינונית',
  escalate: false,
  escalation_reason: null,
  confidence: 0.95,
  summary: 'מתעניינת בהסרת שיער',
  ...over,
});

function setup(classification: Classification | string | (() => never) = ok()) {
  const clock = new FixedClock('2026-09-01T09:00:00.000Z');
  const audit = new AuditLog(clock);
  const leads = new MemoryLeads(audit);
  const interactions = new MemoryInteractions(audit);
  const messenger = new RecordingMessenger();
  const notifier = new RecordingNotifier();
  let current = classification;
  const classifier: Classifier = {
    async classify() {
      return typeof current === 'function' ? current() : current;
    },
  };
  const config: EngineConfig = {
    treatments: TREATMENTS,
    leadLink: (id) => `https://crm.example/leads/${id}`,
    texts: {
      initial: (n, t) => `היי ${n}, קיבלנו את פנייתך בנושא ${t}. מתי נוח לך שנתאם?`,
      holding: (n) => `היי ${n}, מישהו מהצוות יחזור אליך.`,
      followUp: (n) => `היי ${n}, רק מוודאים שראית את ההודעה שלנו.`,
      optOutConfirmation: 'הוסרת מרשימת הפניות. לא נשלח הודעות נוספות.',
      appointmentConfirmation: (n, w) => `היי ${n}, התור נקבע ל־${w}.`,
      reminder: (n, w) => `היי ${n}, תזכורת לתור מחר ${w}.`,
    },
    templates: { initial: 'tpl_initial', followUp: 'tpl_followup', appointmentConfirmation: 'tpl_appt', reminder: 'tpl_reminder' },
    followUpDelayHours: 24,
    retention: { months: 12, mode: 'delete' },
    formatDate: (iso) => iso.slice(0, 16).replace('T', ' '),
  };
  const engine = new LeadsEngine({ leads, interactions, classifier, messenger, notifier, clock, config });
  return {
    engine, clock, audit, leads, interactions, messenger, notifier,
    setClassification: (c: Classification | string) => (current = c),
  };
}

const wa = (text: string, from = '+972 50-123-4567') => ({ channel: 'whatsapp' as const, from, profileName: 'דנה כהן', text });

describe('rules', () => {
  test('normalizePhone', () => {
    assert.equal(normalizePhone('050-1234567'), '+972501234567');
    assert.equal(normalizePhone('+972 50 123 4567'), '+972501234567');
    assert.equal(normalizePhone('00972501234567'), '+972501234567');
    assert.equal(normalizePhone('03-6123456'), '+97236123456');
    assert.equal(normalizePhone('12345'), '');
    assert.equal(normalizePhone(undefined), '');
  });

  test('opt-out detection does not fire on treatments named "הסרה"', () => {
    for (const t of ['הסר', 'הסרה.', 'תסירו אותי מהרשימה', 'אל תפנו אליי יותר', 'תפסיקו לשלוח', 'STOP']) assert.ok(isOptOut(t), t);
    for (const t of ['כמה עולה הסרת שיער?', 'מעוניינת בהסרת קעקוע', 'הסרה של כתם', '']) assert.ok(!isOptOut(t), t);
  });

  test('keyword backstop escalates even when the AI does not', () => {
    assert.equal(decideEscalation('אני בהריון, אפשר?', ok()), 'רפואי');
    assert.equal(decideEscalation('רוצה החזר כספי', ok()), 'ביטול/החזר');
    assert.equal(decideEscalation('יש הנחה?', ok()), 'מחיר חריג');
    assert.equal(decideEscalation('מתי יש תור?', ok({ confidence: 0.4 })), 'AI לא בטוח');
    assert.equal(decideEscalation('מתי יש תור?', ok()), null);
    // עדיפות: רפואי לפני תלונה
    assert.equal(decideEscalation('תלונה: יש לי נפיחות', ok()), 'רפואי');
  });

  test('invalid AI output falls back to "AI לא בטוח"', () => {
    assert.equal(parseClassification('not json', TREATMENTS).escalation_reason, 'AI לא בטוח');
    assert.equal(parseClassification('{"escalate": false}', TREATMENTS).escalation_reason, 'AI לא בטוח');
    assert.equal(parseClassification({ ...ok(), escalation_reason: 'משהו' }, TREATMENTS).escalation_reason, 'AI לא בטוח');
    assert.equal(parseClassification({ ...ok(), treatment: 'ניתוח' }, TREATMENTS).treatment, 'לא ידוע');
    assert.equal(parseClassification('```json\n' + JSON.stringify(ok()) + '\n```', TREATMENTS).escalate, false);
  });
});

describe('inbound flow', () => {
  test('new WhatsApp lead: record, initial reply, status בטיפול, minimal notification', async () => {
    const s = setup();
    const r = await s.engine.handleInbound(wa('היי, מתעניינת בהסרת שיער ברגליים'));
    assert.equal(r.outcome, 'new-lead');

    const lead = s.leads.rows.get(r.leadId)!;
    assert.equal(lead.Lead_Status, 'בטיפול');
    assert.equal(lead.Handling_Mode, 'AI');
    assert.equal(lead.Phone, '+972501234567');
    assert.equal(lead.Consent_Scope, 'שיחה בלבד');
    assert.equal(lead.Next_Follow_Up, '2026-09-02T09:00:00.000Z');

    assert.equal(s.messenger.sent.length, 1);
    assert.equal(s.messenger.sent[0].kind, 'text'); // בתוך חלון 24 השעות
    assert.deepEqual(s.interactions.rows.map((i) => i.Direction), ['נכנס', 'יוצא']);

    const n = s.notifier.sent.at(-1)!;
    assert.equal(n.kind, 'ליד חדש');
    assert.equal(n.firstName, 'דנה');
    assert.ok(!JSON.stringify(n).includes('ברגליים'), 'notification must not contain message content');
  });

  test('invalid phone → דורש בדיקה, not closed, no message', async () => {
    const s = setup();
    const r = await s.engine.handleInbound({ channel: 'instagram', username: 'dana_k', text: 'מחיר לבוטוקס?' });
    assert.equal(r.outcome, 'needs-review');
    const lead = s.leads.rows.get(r.leadId)!;
    assert.equal(lead.Lead_Status, 'דורש בדיקה');
    assert.equal(lead.Handling_Mode, 'מזכירה');
    assert.equal(s.messenger.sent.length, 0);
    assert.equal(s.notifier.sent[0].kind, 'דורש בדיקה');
  });

  test('second message from open lead is attached, no second opening message', async () => {
    const s = setup();
    const first = await s.engine.handleInbound(wa('מתעניינת בהסרת שיער'));
    s.clock.advanceHours(2);
    const second = await s.engine.handleInbound(wa('מתאים לי ביום שלישי בבוקר', '0501234567'));
    assert.equal(second.outcome, 'attached');
    assert.equal(second.leadId, first.leadId);
    assert.equal(s.leads.rows.size, 1);
    assert.equal(s.messenger.sent.length, 1);
    assert.equal(s.interactions.rows.filter((i) => i.Lead_ID === first.leadId).length, 3);
    assert.equal(s.notifier.sent.at(-1)!.kind, 'תגובת לקוח');
  });

  test('closed lead or different treatment → new Lead_ID linked to previous, pending approval', async () => {
    const s = setup();
    const first = await s.engine.handleInbound(wa('מתעניינת בהסרת שיער'));
    s.setClassification(ok({ treatment: 'בוטוקס' }));
    const second = await s.engine.handleInbound(wa('ומה לגבי בוטוקס?'));
    assert.equal(second.outcome, 'new-lead');
    assert.notEqual(second.leadId, first.leadId);
    assert.equal(s.leads.rows.get(second.leadId)!.Related_Lead_ID, first.leadId);
    assert.ok(s.notifier.sent.some((n) => n.kind === 'אישור קישור ללקוח קודם' && n.relatedLeadId === first.leadId));
  });

  test('medical question → צוות רפואי, status unchanged, holding reply only, content hidden from secretary', async () => {
    const s = setup(ok({ confidence: 0.9 }));
    const r = await s.engine.handleInbound(wa('אני בהריון, אפשר לעשות הסרת שיער?'));
    assert.equal(r.outcome, 'escalated');
    const lead = s.leads.rows.get(r.leadId)!;
    assert.equal(lead.Handling_Mode, 'צוות רפואי');
    assert.equal(lead.Escalation_Reason, 'רפואי');
    assert.equal(lead.Lead_Status, 'חדש');
    assert.equal(lead.Notes, '');

    assert.equal(s.messenger.sent.length, 1);
    assert.match((s.messenger.sent[0] as { text: string }).text, /מישהו מהצוות יחזור אליך/);

    const n = s.notifier.sent.find((x) => x.kind === 'הסלמה')!;
    assert.equal(n.audience, 'צוות רפואי');
    assert.equal(n.escalationReason, 'רפואי');
    assert.ok(!JSON.stringify(s.notifier.sent).includes('הריון'));

    const list = await s.interactions.listByLead(r.leadId, 'secretary');
    assert.equal(viewInteractions(list, 'מזכירה')[0].Content, REDACTED);
    assert.match(viewInteractions(list, 'צוות רפואי')[0].Content, /הריון/);
  });

  test('classifier failure → escalated as "AI לא בטוח"', async () => {
    const s = setup(() => {
      throw new Error('timeout');
    });
    const r = await s.engine.handleInbound(wa('שלום'));
    assert.equal(r.escalationReason, 'AI לא בטוח');
    assert.equal(s.leads.rows.get(r.leadId)!.Handling_Mode, 'מזכירה');
  });

  test('opt-out closes open leads, sends a single confirmation and blocks all future sends', async () => {
    const s = setup();
    const first = await s.engine.handleInbound(wa('מתעניינת בהסרת שיער'));
    const r = await s.engine.handleInbound(wa('הסר'));
    assert.equal(r.outcome, 'opted-out');
    const lead = s.leads.rows.get(first.leadId)!;
    assert.equal(lead.Opt_Out, true);
    assert.equal(lead.Lead_Status, 'נסגר');
    assert.equal(lead.Close_Reason, 'ביקש הסרה');
    assert.equal(s.messenger.sent.length, 2); // פתיחה + אישור הסרה

    await s.engine.handleInbound(wa('הסר'));
    assert.equal(s.messenger.sent.length, 2, 'confirmation is sent once');

    s.setClassification(ok({ treatment: 'בוטוקס' }));
    const again = await s.engine.handleInbound(wa('מתעניינת בבוטוקס'));
    assert.equal(again.outcome, 'suppressed');
    assert.equal(s.messenger.sent.length, 2);
    s.clock.advanceHours(48);
    await s.engine.runHourlyScan();
    assert.equal(s.messenger.sent.length, 2);
  });

  test('form without consent checkbox → initial via template, no follow-ups', async () => {
    const s = setup();
    const r = await s.engine.handleInbound({ channel: 'form', name: 'יעל לוי', phone: '052-7654321', treatment: 'פילינג', consent: false });
    const lead = s.leads.rows.get(r.leadId)!;
    assert.equal(lead.Requested_Treatment, 'פילינג');
    assert.equal(lead.Consent, false);
    assert.equal(s.messenger.sent[0].kind, 'template'); // טופס לא פותח חלון שיחה
    s.clock.advanceHours(25);
    const scan = await s.engine.runHourlyScan();
    assert.equal(scan.followUps, 0);
  });
});

describe('follow-up, booking, retention', () => {
  test('two follow-ups via approved template, then closed as לא ענה', async () => {
    const s = setup();
    const r = await s.engine.handleInbound(wa('מתעניינת בהסרת שיער'));
    s.clock.advanceHours(24);
    assert.equal((await s.engine.runHourlyScan()).followUps, 1);
    assert.equal(s.messenger.sent.at(-1)!.kind, 'template');
    s.clock.advanceHours(1);
    assert.equal((await s.engine.runHourlyScan()).followUps, 0, 'not due yet');
    s.clock.advanceHours(23);
    assert.equal((await s.engine.runHourlyScan()).followUps, 1);
    s.clock.advanceHours(24);
    assert.equal((await s.engine.runHourlyScan()).closed, 1);
    const lead = s.leads.rows.get(r.leadId)!;
    assert.equal(lead.Lead_Status, 'נסגר');
    assert.equal(lead.Close_Reason, 'לא ענה');
    assert.equal(s.notifier.sent.at(-1)!.kind, 'נסגר – לא ענה');
  });

  test('without an approved template, out-of-window follow-up is not sent and the secretary is told', async () => {
    const s = setup();
    await s.engine.handleInbound(wa('מתעניינת בהסרת שיער'));
    (s.engine as unknown as { d: { config: EngineConfig } }).d.config.templates = {};
    s.clock.advanceHours(24);
    assert.equal((await s.engine.runHourlyScan()).followUps, 0);
    assert.equal(s.notifier.sent.at(-1)!.kind, 'הודעה לא נשלחה');
  });

  test('booking cancels follow-ups, confirms, and reminds a day before', async () => {
    const s = setup();
    const r = await s.engine.handleInbound(wa('מתעניינת בהסרת שיער'));
    await s.engine.onAppointmentBooked(r.leadId, '2026-09-05T10:00:00.000Z', 'secretary:rina');
    const lead = s.leads.rows.get(r.leadId)!;
    assert.equal(lead.Lead_Status, 'נקבע תור');
    assert.equal(lead.Next_Follow_Up, null);
    assert.equal(s.messenger.sent.length, 2);

    s.clock.set('2026-09-04T09:00:00.000Z');
    assert.equal((await s.engine.runHourlyScan()).reminders, 0);
    s.clock.set('2026-09-04T11:00:00.000Z');
    assert.equal((await s.engine.runHourlyScan()).reminders, 1);
    assert.equal((await s.engine.runHourlyScan()).reminders, 0, 'reminder sent once');
    assert.ok(s.audit.entries.some((e) => e.actor === 'secretary:rina' && e.action === 'update'));
  });

  test('retention deletes old closed leads but keeps a minimal opt-out record', async () => {
    const s = setup();
    const a = await s.engine.handleInbound(wa('מתעניינת בהסרת שיער', '050-1111111'));
    const b = await s.engine.handleInbound(wa('הסר', '050-2222222'));
    await s.leads.update(a.leadId, { Lead_Status: 'נסגר', Close_Reason: 'לא רלוונטי' }, 'secretary');
    s.clock.advanceHours(24 * 400);
    const res = await s.engine.runRetention();
    assert.deepEqual(res, { deleted: 1, anonymized: 1 });
    assert.ok(!s.leads.rows.has(a.leadId));
    const kept = s.leads.rows.get(b.leadId)!;
    assert.equal(kept.Name, '');
    assert.equal(kept.Phone, '+972502222222');
    assert.equal(kept.Opt_Out, true);
    assert.equal(s.interactions.rows.length, 0);
  });
});

describe('access', () => {
  test('role-based views and manager report', async () => {
    const s = setup();
    const r = await s.engine.handleInbound(wa('מתעניינת בהסרת שיער'));
    const lead = s.leads.rows.get(r.leadId)!;
    assert.ok('Notes' in viewLead(lead, 'מזכירה'));
    assert.ok(!('Notes' in viewLead(lead, 'צוות רפואי')));
    assert.throws(() => viewLead(lead, 'מנהל'));
    const report = buildReport([...s.leads.rows.values()]);
    assert.equal(report.total, 1);
    assert.equal(report.byStatus['בטיפול'], 1);
    assert.ok(!JSON.stringify(report).includes('דנה'));
  });
});
