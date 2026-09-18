import test from 'node:test';
import assert from 'node:assert/strict';
import { detectSource, normalizeInbound } from '../lib/normalize.js';

const WHATSAPP = {
  object: 'whatsapp_business_account',
  entry: [{ changes: [{ value: {
    contacts: [{ profile: { name: 'דנה לוי' }, wa_id: '972501234567' }],
    messages: [{ from: '972501234567', id: 'wamid.1', timestamp: '1758200000', text: { body: 'היי, מעוניינת בבוטוקס' } }],
  } }] }],
};

const INSTAGRAM_DM = {
  object: 'instagram',
  entry: [{ time: 1758200000, messaging: [{ sender: { id: '17841' }, message: { mid: 'm1', text: 'אשמח לפרטים על לייזר' }, timestamp: 1758200000000 }] }],
};

const INSTAGRAM_COMMENT = {
  object: 'instagram',
  entry: [{ time: 1758200000, changes: [{ field: 'comments', value: { id: 'c1', from: { id: '99', username: 'yael' }, text: 'מעוניינת!' } }] }],
};

const FORM = { source: 'form', name: 'יעל כהן', phone: '050-111-2222', treatment: 'בוטוקס', message: 'אשמח לפרטים', submissionId: 'f-9' };

const TWILIO = { MessageSid: 'SM1', From: 'whatsapp:+972501234567', ProfileName: 'דנה', Body: 'היי' };

test('מזהה את המקור לפי מבנה ה-payload', () => {
  assert.equal(detectSource(WHATSAPP), 'meta_whatsapp');
  assert.equal(detectSource(INSTAGRAM_DM), 'meta_instagram');
  assert.equal(detectSource(TWILIO), 'twilio_whatsapp');
  assert.equal(detectSource(FORM), 'form');
  assert.equal(detectSource({}), 'unknown');
});

test('שלושת המקורות מתמפים למבנה אחיד', () => {
  const wa = normalizeInbound(WHATSAPP);
  assert.equal(wa.channel, 'whatsapp');
  assert.equal(wa.phone, '+972501234567');
  assert.equal(wa.fullName, 'דנה לוי');
  assert.equal(wa.messageText, 'היי, מעוניינת בבוטוקס');
  assert.equal(wa.receivedAt, '2025-09-18T12:53:20.000Z');

  const ig = normalizeInbound(INSTAGRAM_DM);
  assert.equal(ig.channel, 'instagram');
  assert.equal(ig.phone, null);
  assert.deepEqual(ig.replyTo, { channel: 'instagram', address: '17841' });

  const comment = normalizeInbound(INSTAGRAM_COMMENT);
  assert.equal(comment.messageText, 'מעוניינת!');
  assert.equal(comment.fullName, 'yael');

  const form = normalizeInbound(FORM);
  assert.equal(form.treatmentHint, 'בוטוקס');
  // לטופס אין ערוץ לענות בו — התשובה יוצאת בוואטסאפ
  assert.deepEqual(form.replyTo, { channel: 'whatsapp', address: '+972501112222' });
});

test('payload לא מוכר לא מפיל את הצינור', () => {
  const result = normalizeInbound({ something: 'else' });
  assert.equal(result.channel, 'unknown');
  assert.equal(result.phone, null);
});
