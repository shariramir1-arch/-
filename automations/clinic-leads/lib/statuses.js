/**
 * סטטוסים ומעברים חוקיים בצינור הלידים של הקליניקה.
 * מקור אמת יחיד — גם האוטומציה וגם הגיליון משתמשים במחרוזות האלה בדיוק.
 */

export const STATUS = {
  NEW: 'חדש',
  CONTACTED: 'נוצר קשר',
  AWAITING_REPLY: 'ממתין לתשובה',
  BOOKED: 'נקבע תור',
  IRRELEVANT: 'לא רלוונטי',
  HANDED_TO_HUMAN: 'הועבר לאדם',
};

export const ALL_STATUSES = Object.values(STATUS);

/** סטטוסים סופיים — אין עליהם מעקב אוטומטי. */
export const TERMINAL_STATUSES = [STATUS.BOOKED, STATUS.IRRELEVANT];

/** סטטוסים שבהם המעקב האוטומטי פעיל. */
export const FOLLOWUP_STATUSES = [STATUS.CONTACTED, STATUS.AWAITING_REPLY];

const TRANSITIONS = {
  [STATUS.NEW]: [STATUS.CONTACTED, STATUS.IRRELEVANT, STATUS.HANDED_TO_HUMAN],
  [STATUS.CONTACTED]: [STATUS.AWAITING_REPLY, STATUS.BOOKED, STATUS.IRRELEVANT, STATUS.HANDED_TO_HUMAN],
  [STATUS.AWAITING_REPLY]: [STATUS.CONTACTED, STATUS.BOOKED, STATUS.IRRELEVANT, STATUS.HANDED_TO_HUMAN],
  // ליד שנסגר יכול להיפתח מחדש כשמגיעה הודעה חדשה מאותו טלפון
  [STATUS.IRRELEVANT]: [STATUS.CONTACTED, STATUS.HANDED_TO_HUMAN],
  [STATUS.HANDED_TO_HUMAN]: [STATUS.BOOKED, STATUS.IRRELEVANT, STATUS.CONTACTED],
  [STATUS.BOOKED]: [STATUS.HANDED_TO_HUMAN, STATUS.IRRELEVANT],
};

export function isValidStatus(status) {
  return ALL_STATUSES.includes(status);
}

export function canTransition(from, to) {
  if (from === to) return true;
  return (TRANSITIONS[from] || []).includes(to);
}

export function isFollowupStatus(status) {
  return FOLLOWUP_STATUSES.includes(status);
}
