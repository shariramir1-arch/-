import test from 'node:test';
import assert from 'node:assert/strict';
import { planAppointmentBooked, planAppointmentReminder, planFollowup, planHourlyScan } from '../lib/followup.js';
import { ACTION } from '../lib/pipeline.js';
import { STATUS } from '../lib/statuses.js';

const NOW = '2026-09-18T09:00:00.000Z';
const base = {
  leadKey: '+972501234567', fullName: 'דנה לוי', phone: '+972501234567', source: 'וואטסאפ',
  requestedTreatment: 'בוטוקס', status: STATUS.CONTACTED, followupAttempts: 0, notes: 'התחלה',
  nextFollowupAt: '2026-09-18T08:00:00.000Z', appointmentAt: '', appointmentReminderSent: false,
};
const firstOfType = (plan, type) => plan.actions.find((action) => action.type === type);

test('מעקב ראשון: תזכורת ללקוח, ניסיון +1, סטטוס "ממתין לתשובה"', () => {
  const plan = planFollowup(base, NOW);
  assert.equal(plan.due, true);
  assert.equal(firstOfType(plan, ACTION.SEND_MESSAGE).kind, 'followup');
  const updates = firstOfType(plan, ACTION.UPDATE_RECORD).updates;
  assert.equal(updates.status, STATUS.AWAITING_REPLY);
  assert.equal(updates.followupAttempts, 1);
  assert.equal(updates.nextFollowupAt, '2026-09-19T09:00:00.000Z');
});

test('אחרי 2 ניסיונות ללא מענה: סגירה כ"לא רלוונטי" והתראה, בלי עוד הודעות ללקוח', () => {
  const plan = planFollowup({ ...base, status: STATUS.AWAITING_REPLY, followupAttempts: 2 }, NOW);
  assert.equal(plan.reason, 'closed_no_answer');
  assert.equal(firstOfType(plan, ACTION.SEND_MESSAGE), undefined);
  assert.equal(firstOfType(plan, ACTION.UPDATE_RECORD).updates.status, STATUS.IRRELEVANT);
  assert.match(firstOfType(plan, ACTION.NOTIFY_STAFF).text, /ללא מענה/);
});

test('לא נוגעים בליד שלא הגיע מועד המעקב שלו או שכבר נסגר/נקבע לו תור', () => {
  assert.equal(planFollowup({ ...base, nextFollowupAt: '2026-09-19T00:00:00.000Z' }, NOW).due, false);
  assert.equal(planFollowup({ ...base, status: STATUS.BOOKED }, NOW).due, false);
  assert.equal(planFollowup({ ...base, status: STATUS.IRRELEVANT }, NOW).due, false);
  assert.equal(planFollowup({ ...base, status: STATUS.HANDED_TO_HUMAN }, NOW).due, false);
});

test('קביעת תור: אישור ללקוח, ביטול מעקבים, תזכורת יום לפני', () => {
  const plan = planAppointmentBooked({ ...base, status: STATUS.BOOKED, appointmentAt: '2026-09-25T07:00:00.000Z', followupAttempts: 1 }, NOW);
  assert.equal(plan.ok, true);
  assert.equal(firstOfType(plan, ACTION.SEND_MESSAGE).kind, 'appointment_confirmation');
  const updates = firstOfType(plan, ACTION.UPDATE_RECORD).updates;
  assert.equal(updates.nextFollowupAt, '');
  assert.equal(updates.followupAttempts, 0);
  assert.equal(updates.appointmentReminderAt, '2026-09-24T07:00:00.000Z');
  assert.equal(updates.appointmentReminderSent, false);
});

test('תור בעוד פחות מ-24 שעות לא מתזמן תזכורת כפולה', () => {
  const plan = planAppointmentBooked({ ...base, status: STATUS.BOOKED, appointmentAt: '2026-09-18T18:00:00.000Z' }, NOW);
  const updates = firstOfType(plan, ACTION.UPDATE_RECORD).updates;
  assert.equal(updates.appointmentReminderAt, '');
  assert.equal(updates.appointmentReminderSent, true);
});

test('"נקבע תור" בלי תאריך מייצר התראה ולא הודעה ללקוח', () => {
  const plan = planAppointmentBooked({ ...base, status: STATUS.BOOKED, appointmentAt: '' }, NOW);
  assert.equal(plan.ok, false);
  assert.equal(firstOfType(plan, ACTION.SEND_MESSAGE), undefined);
  assert.equal(firstOfType(plan, ACTION.NOTIFY_STAFF).severity, 'warning');
});

test('תזכורת התור נשלחת פעם אחת בלבד', () => {
  const record = {
    ...base, status: STATUS.BOOKED, nextFollowupAt: '', appointmentAt: '2026-09-19T07:00:00.000Z',
    appointmentReminderAt: '2026-09-18T07:00:00.000Z', appointmentReminderSent: false,
  };
  const plan = planAppointmentReminder(record, NOW);
  assert.equal(plan.due, true);
  assert.equal(firstOfType(plan, ACTION.SEND_MESSAGE).kind, 'appointment_reminder');
  assert.equal(firstOfType(plan, ACTION.UPDATE_RECORD).updates.appointmentReminderSent, true);

  assert.equal(planAppointmentReminder({ ...record, appointmentReminderSent: true }, NOW).due, false);
  assert.equal(planAppointmentReminder({ ...record, appointmentAt: '2026-09-17T07:00:00.000Z' }, NOW).due, false);
});

test('הסריקה השעתית מסכמת מה נעשה', () => {
  const records = [
    base,
    { ...base, leadKey: 'b', status: STATUS.AWAITING_REPLY, followupAttempts: 2 },
    { ...base, leadKey: 'c', status: STATUS.BOOKED, nextFollowupAt: '', appointmentAt: '2026-09-19T07:00:00.000Z', appointmentReminderAt: '2026-09-18T07:00:00.000Z' },
    { ...base, leadKey: 'd', nextFollowupAt: '2026-09-30T00:00:00.000Z' },
  ];
  const { summary } = planHourlyScan(records, NOW);
  assert.deepEqual(summary, { scanned: 4, reminders: 1, closed: 1, appointmentReminders: 1 });
});
