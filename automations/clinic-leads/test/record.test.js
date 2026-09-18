import test from 'node:test';
import assert from 'node:assert/strict';
import { COLUMNS, HEADERS, appendNote, fromSheetObject, fromSheetRow, toSheetObject, toSheetRow } from '../lib/record.js';
import { ALL_STATUSES, canTransition, STATUS } from '../lib/statuses.js';

const record = {
  leadKey: '+972501234567', fullName: 'דנה לוי', phone: '+972501234567', source: 'וואטסאפ',
  requestedTreatment: 'בוטוקס', originalMessage: 'היי', receivedAt: '2026-09-18T09:00:00.000Z',
  status: STATUS.NEW, nextFollowupAt: '2026-09-19T09:00:00.000Z', followupAttempts: 0, owner: 'AI',
  appointmentAt: '', notes: 'שורה', updatedAt: '2026-09-18T09:00:00.000Z', urgency: 'בינונית',
  escalationReasons: '', confidence: 0.9, channelHandle: '', lastExternalId: 'wamid.1',
  problematicHistory: false, appointmentReminderAt: '', appointmentReminderSent: false,
};

test('כותרות הגיליון תואמות לסדר העמודות', () => {
  assert.equal(HEADERS.length, COLUMNS.length);
  assert.equal(HEADERS[0], 'מפתח ליד');
  assert.ok(HEADERS.includes('מועד מעקב הבא'));
  assert.ok(HEADERS.includes('מי מטפל'));
});

test('הלוך ושוב בין רשומה לשורה שומר על הערכים', () => {
  const back = fromSheetRow(toSheetRow(record));
  assert.equal(back.leadKey, record.leadKey);
  assert.equal(back.followupAttempts, 0);
  assert.equal(back.confidence, 0.9);
  assert.equal(back.problematicHistory, false);
  assert.equal(back.appointmentReminderSent, false);
});

test('הלוך ושוב מול אובייקט עם כותרות עבריות', () => {
  const object = toSheetObject({ ...record, problematicHistory: true });
  assert.equal(object['שם מלא'], 'דנה לוי');
  assert.equal(object['היסטוריה בעייתית'], 'TRUE');
  assert.equal(fromSheetObject(object).problematicHistory, true);
});

test('הערה חדשה לא דורסת קיימות', () => {
  const notes = appendNote('הערה ראשונה', 'הערה שנייה', '2026-09-18T09:00:00.000Z');
  assert.match(notes, /הערה ראשונה/);
  assert.match(notes, /הערה שנייה/);
  assert.equal(notes.split('\n').length, 2);
});

test('מעברי סטטוס חוקיים בלבד', () => {
  assert.equal(canTransition(STATUS.NEW, STATUS.CONTACTED), true);
  assert.equal(canTransition(STATUS.CONTACTED, STATUS.BOOKED), true);
  assert.equal(canTransition(STATUS.IRRELEVANT, STATUS.CONTACTED), true);
  assert.equal(canTransition(STATUS.NEW, STATUS.BOOKED), false);
  assert.equal(ALL_STATUSES.length, 6);
});
