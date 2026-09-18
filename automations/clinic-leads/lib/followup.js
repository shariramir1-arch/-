import { CONFIG } from './config.js';
import { STATUS, isFollowupStatus } from './statuses.js';
import { OWNER, addHours, appendNote } from './record.js';
import { ACTION } from './pipeline.js';
import * as messages from './messages.js';

/**
 * שלבים 8–9 בצינור: המעקב השעתי וקביעת התור.
 * גם כאן — פונקציות טהורות שמחזירות פעולות, בלי קריאות רשת.
 */

const isDue = (isoString, now) => {
  if (!isoString) return false;
  const due = new Date(isoString).getTime();
  return Number.isFinite(due) && due <= new Date(now).getTime();
};

/** לאן שולחים הודעה ללקוח קיים, לפי מה ששמור ברשומה. */
export function replyTargetForRecord(record) {
  if (record.phone) return { channel: 'whatsapp', address: record.phone };
  if (record.source === CONFIG.channelLabels.instagram && record.channelHandle) {
    return { channel: 'instagram', address: record.channelHandle };
  }
  return { channel: 'unknown', address: null };
}

function messageAction(record, text, kind) {
  const target = replyTargetForRecord(record);
  return { type: ACTION.SEND_MESSAGE, kind, channel: target.channel, to: target.address, text };
}

/**
 * מה לעשות עם ליד אחד בסריקה השעתית.
 * @param {Object} record  רשומה מהגיליון
 * @param {string} now  ISO
 * @param {string} [sheetUrl]
 * @returns {{due: boolean, reason: string, actions: Array}}
 */
export function planFollowup(record, now, sheetUrl) {
  if (!isFollowupStatus(record.status)) {
    return { due: false, reason: 'status_not_eligible', actions: [] };
  }
  if (!isDue(record.nextFollowupAt, now)) {
    return { due: false, reason: 'not_due', actions: [] };
  }

  const attempts = Number(record.followupAttempts) || 0;

  // מיצינו את הניסיונות — סוגרים ומודיעים למזכירה, בלי עוד הודעות ללקוח
  if (attempts >= CONFIG.maxFollowupAttempts) {
    return {
      due: true,
      reason: 'closed_no_answer',
      actions: [
        {
          type: ACTION.UPDATE_RECORD,
          key: record.leadKey,
          updates: {
            status: STATUS.IRRELEVANT,
            owner: OWNER.SECRETARY,
            nextFollowupAt: '',
            notes: appendNote(record.notes, `נסגר אוטומטית אחרי ${attempts} ניסיונות מעקב ללא מענה`, now),
            updatedAt: now,
          },
        },
        { type: ACTION.NOTIFY_STAFF, severity: 'warning', text: messages.noAnswerAlert(record, sheetUrl) },
      ],
    };
  }

  const attempt = attempts + 1;
  return {
    due: true,
    reason: 'reminder_sent',
    actions: [
      messageAction(record, messages.followupReminder(record, attempt), 'followup'),
      {
        type: ACTION.UPDATE_RECORD,
        key: record.leadKey,
        updates: {
          status: STATUS.AWAITING_REPLY,
          followupAttempts: attempt,
          nextFollowupAt: addHours(now, CONFIG.followupHours),
          notes: appendNote(record.notes, `נשלחה תזכורת מעקב (${attempt}/${CONFIG.maxFollowupAttempts})`, now),
          updatedAt: now,
        },
      },
    ],
  };
}

/**
 * הופעל כשהמזכירה (או אינטגרציה ליומן) סימנה "נקבע תור".
 * מבטל מעקבים, שולח אישור, ומתזמן תזכורת יום לפני.
 */
export function planAppointmentBooked(record, now, sheetUrl) {
  if (record.status !== STATUS.BOOKED) {
    return { ok: false, reason: 'status_not_booked', actions: [] };
  }
  const appointmentAt = record.appointmentAt ? new Date(record.appointmentAt) : null;
  if (!appointmentAt || Number.isNaN(appointmentAt.getTime())) {
    return {
      ok: false,
      reason: 'missing_appointment_date',
      actions: [{
        type: ACTION.NOTIFY_STAFF,
        severity: 'warning',
        text: `⚠️ הליד סומן "נקבע תור" בלי תאריך תור — ${record.fullName} (${record.phone || 'אין טלפון'})`,
      }],
    };
  }

  const reminderAt = addHours(appointmentAt.toISOString(), -CONFIG.appointmentReminderHours);
  const alreadyPast = new Date(reminderAt).getTime() <= new Date(now).getTime();

  return {
    ok: true,
    reason: 'confirmation_sent',
    actions: [
      messageAction(record, messages.appointmentConfirmation(record), 'appointment_confirmation'),
      {
        type: ACTION.UPDATE_RECORD,
        key: record.leadKey,
        updates: {
          owner: OWNER.SECRETARY,
          nextFollowupAt: '', // ביטול כל מעקב תלוי
          followupAttempts: 0,
          // תור שנקבע לפחות מ-24 שעות מראש לא מקבל תזכורת נפרדת
          appointmentReminderAt: alreadyPast ? '' : reminderAt,
          appointmentReminderSent: alreadyPast,
          notes: appendNote(record.notes, `נקבע תור ל-${messages.formatAppointment(record.appointmentAt)}, נשלח אישור`, now),
          updatedAt: now,
        },
      },
    ],
  };
}

/** תזכורת יום לפני התור — נבדקת באותה סריקה שעתית. */
export function planAppointmentReminder(record, now) {
  if (record.status !== STATUS.BOOKED) return { due: false, reason: 'status_not_booked', actions: [] };
  if (record.appointmentReminderSent === true) return { due: false, reason: 'already_sent', actions: [] };
  if (!isDue(record.appointmentReminderAt, now)) return { due: false, reason: 'not_due', actions: [] };
  if (new Date(record.appointmentAt).getTime() <= new Date(now).getTime()) {
    return { due: false, reason: 'appointment_passed', actions: [] };
  }

  return {
    due: true,
    reason: 'reminder_sent',
    actions: [
      messageAction(record, messages.appointmentReminder(record), 'appointment_reminder'),
      {
        type: ACTION.UPDATE_RECORD,
        key: record.leadKey,
        updates: {
          appointmentReminderSent: true,
          appointmentReminderAt: '',
          notes: appendNote(record.notes, 'נשלחה תזכורת יום לפני התור', now),
          updatedAt: now,
        },
      },
    ],
  };
}

/**
 * הסריקה השעתית על כל הגיליון.
 * @param {Object[]} records
 * @param {string} now
 * @returns {{actions: Array, summary: Object}}
 */
export function planHourlyScan(records = [], now, sheetUrl) {
  const actions = [];
  const summary = { scanned: records.length, reminders: 0, closed: 0, appointmentReminders: 0 };

  for (const record of records) {
    const followup = planFollowup(record, now, sheetUrl);
    if (followup.due) {
      actions.push(...followup.actions);
      if (followup.reason === 'reminder_sent') summary.reminders += 1;
      if (followup.reason === 'closed_no_answer') summary.closed += 1;
      continue;
    }

    const reminder = planAppointmentReminder(record, now);
    if (reminder.due) {
      actions.push(...reminder.actions);
      summary.appointmentReminders += 1;
    }
  }

  return { actions, summary };
}
