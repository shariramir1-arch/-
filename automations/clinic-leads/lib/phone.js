import { CONFIG } from './config.js';

/**
 * נרמול טלפון למפתח ייחודי אחד (E.164).
 * כל מקור מגיע בפורמט אחר: וואטסאפ שולח "972501234567@c.us",
 * אינסטגרם לא שולח טלפון בכלל, וטופס שולח מה שהמשתמש הקליד.
 */

const IL_MOBILE = /^0(?:5\d|7[2-9])\d{7}$/;
const IL_LANDLINE = /^0[23489]\d{7}$/;

function digitsOnly(value) {
  return String(value).replace(/\D/g, '');
}

/**
 * @param {string|number|null|undefined} raw
 * @returns {{ok: true, e164: string, national: string|null, isIsraeli: boolean, type: 'mobile'|'landline'|'unknown'}
 *          |{ok: false, reason: string}}
 */
export function normalizePhone(raw) {
  if (raw === null || raw === undefined) return { ok: false, reason: 'missing' };

  const input = String(raw).trim();
  if (!input) return { ok: false, reason: 'missing' };

  // מזהי וואטסאפ/מטא מגיעים כ-"972501234567@c.us" או "972501234567@s.whatsapp.net"
  const stripped = input.split('@')[0].trim();
  const hadInternationalPrefix = stripped.startsWith('+') || /^00\d/.test(stripped.replace(/[\s-]/g, ''));

  let digits = digitsOnly(stripped);
  if (!digits) return { ok: false, reason: 'no_digits' };

  if (digits.startsWith('00')) digits = digits.slice(2);

  const cc = CONFIG.countryCode;
  let national = null;

  if (digits.startsWith(cc) && digits.length > cc.length) {
    national = '0' + digits.slice(cc.length);
  } else if (digits.startsWith('0')) {
    national = digits;
  } else if (!hadInternationalPrefix && digits.length >= 8 && digits.length <= 9) {
    // מספר ישראלי שנכתב בלי אפס מוביל: "501234567"
    national = '0' + digits;
  }

  if (national && (IL_MOBILE.test(national) || IL_LANDLINE.test(national))) {
    return {
      ok: true,
      e164: `+${cc}${national.slice(1)}`,
      national,
      isIsraeli: true,
      type: IL_MOBILE.test(national) ? 'mobile' : 'landline',
    };
  }

  // מספר ישראלי שלא עומד בתבנית — נפסל, אין טעם לשלוח אליו הודעה
  if (national) return { ok: false, reason: 'invalid_israeli_number' };

  // מספר זר תקין באורכו — נשמר כמו שהוא, מסומן כלא-ישראלי
  if (digits.length >= 8 && digits.length <= 15) {
    return { ok: true, e164: `+${digits}`, national: null, isIsraeli: false, type: 'unknown' };
  }

  return { ok: false, reason: 'invalid_length' };
}

/** נוח לשימוש בביטויי n8n: מחזיר מחרוזת או null. */
export function toE164(raw) {
  const result = normalizePhone(raw);
  return result.ok ? result.e164 : null;
}

export function isValidPhone(raw) {
  return normalizePhone(raw).ok;
}

/** תצוגה ידידותית למזכירה בהתראות. */
export function formatForDisplay(e164) {
  const result = normalizePhone(e164);
  if (!result.ok) return String(e164 ?? '');
  if (!result.national) return result.e164;
  return result.type === 'mobile'
    ? `${result.national.slice(0, 3)}-${result.national.slice(3)}`
    : `${result.national.slice(0, 2)}-${result.national.slice(2)}`;
}
