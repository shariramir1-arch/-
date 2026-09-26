// שלב 1 – קליטה ונרמול: כל ערוץ מגיע ל־webhook אחד ומומר למבנה אחיד.
import type { Channel } from './schema.ts';

export type RawInbound =
  | { channel: 'whatsapp'; from: string; profileName?: string; text?: string; timestamp?: string }
  | { channel: 'instagram'; username?: string; name?: string; phone?: string; text?: string; timestamp?: string }
  | {
      channel: 'form';
      name?: string;
      phone?: string;
      treatment?: string;
      message?: string;
      consent?: boolean;
      timestamp?: string;
    };

export interface InboundMessage {
  channel: Channel;
  name: string;
  phoneRaw: string;
  /** '' כשהטלפון חסר או לא תקין. */
  phone: string;
  text: string;
  /** טיפול שנבחר בטופס; בערוצי הודעות נקבע בסיווג. */
  requestedTreatment: string;
  /** checkbox בטופס; undefined בערוצי הודעות. */
  consentCheckbox?: boolean;
  receivedAt: string;
}

/**
 * מנרמל מספר ישראלי ל־E.164 (+972...). מחזיר '' למספר חסר או לא תקין.
 * מקבל 050-1234567, +972 50 123 4567, 972501234567, 0097250...
 */
export function normalizePhone(raw: string | undefined): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('972')) digits = '0' + digits.slice(3);
  // נייד: 05X + 7 ספרות; נייח: 0[2-4,8,9] + 7 ספרות; 07X + 7 ספרות.
  if (!/^0(5\d|7\d)\d{7}$/.test(digits) && !/^0[23489]\d{7}$/.test(digits)) return '';
  return '+972' + digits.slice(1);
}

export function normalizeInbound(raw: RawInbound, now: string): InboundMessage {
  const receivedAt = raw.timestamp ?? now;
  switch (raw.channel) {
    case 'whatsapp':
      return {
        channel: 'whatsapp',
        name: (raw.profileName ?? '').trim(),
        phoneRaw: raw.from ?? '',
        phone: normalizePhone(raw.from),
        text: (raw.text ?? '').trim(),
        requestedTreatment: '',
        receivedAt,
      };
    case 'instagram':
      return {
        channel: 'instagram',
        name: (raw.name ?? raw.username ?? '').trim(),
        phoneRaw: raw.phone ?? '',
        phone: normalizePhone(raw.phone),
        text: (raw.text ?? '').trim(),
        requestedTreatment: '',
        receivedAt,
      };
    case 'form':
      return {
        channel: 'form',
        name: (raw.name ?? '').trim(),
        phoneRaw: raw.phone ?? '',
        phone: normalizePhone(raw.phone),
        text: (raw.message ?? '').trim(),
        requestedTreatment: (raw.treatment ?? '').trim(),
        consentCheckbox: raw.consent === true,
        receivedAt,
      };
  }
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}
