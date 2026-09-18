import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, toE164, formatForDisplay } from '../lib/phone.js';

test('מנרמל כל וריאציה ישראלית לאותו מפתח', () => {
  const variants = ['0501234567', '050-123-4567', '+972501234567', '972501234567', '00972501234567', '972501234567@c.us', '501234567', ' 050 1234567 '];
  for (const variant of variants) {
    assert.equal(toE164(variant), '+972501234567', `נכשל על ${variant}`);
  }
});

test('מזהה קווי ונייד', () => {
  assert.equal(normalizePhone('03-1234567').type, 'landline');
  assert.equal(normalizePhone('0721234567').type, 'mobile');
});

test('פוסל מספרים ישראליים לא תקינים', () => {
  for (const bad of ['', null, undefined, 'abc', '05012345', '0501234567890', '0101234567']) {
    assert.equal(normalizePhone(bad).ok, false, `היה אמור להיפסל: ${bad}`);
  }
});

test('שומר מספר זר עם קידומת בינלאומית', () => {
  const result = normalizePhone('+1 415 555 1234');
  assert.equal(result.ok, true);
  assert.equal(result.e164, '+14155551234');
  assert.equal(result.isIsraeli, false);
});

test('תצוגה ידידותית למזכירה', () => {
  assert.equal(formatForDisplay('+972501234567'), '050-1234567');
  assert.equal(formatForDisplay('+97231234567'), '03-1234567');
});
