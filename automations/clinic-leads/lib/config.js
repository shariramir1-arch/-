/**
 * כל הפרמטרים התפעוליים במקום אחד. שינוי כאן משנה גם את ה-workflows של n8n
 * (הם נבנים מהקוד הזה דרך scripts/build-n8n.mjs).
 */

export const CONFIG = {
  /** אזור זמן לתצוגה ולחישוב תזכורות. */
  timezone: 'Asia/Jerusalem',

  /** קידומת מדינה יחידה שאליה מנרמלים כל טלפון. */
  countryCode: '972',

  /** כמה שעות אחרי יצירת הליד נבדק המעקב הראשון. */
  followupHours: 24,

  /** מספר תזכורות אוטומטיות מקסימלי לפני סגירת הליד. */
  maxFollowupAttempts: 2,

  /** כמה שעות לפני התור נשלחת תזכורת ללקוח. */
  appointmentReminderHours: 24,

  /** מתחת לסף הזה סיווג ה-AI נחשב לא בטוח והליד עובר לאדם. */
  minClassificationConfidence: 0.7,

  /** אורך מינימלי של הודעה שנחשבת פנייה אמיתית. */
  minMessageLength: 2,

  /** ערוצים שבהם טלפון הוא שדה חובה (באינסטגרם הוא לא מגיע ב-webhook). */
  phoneRequiredChannels: ['whatsapp', 'form'],

  /** ערוצים נתמכים. */
  channels: ['whatsapp', 'instagram', 'form'],

  /** תוויות הערוצים בגיליון. */
  channelLabels: {
    whatsapp: 'וואטסאפ',
    instagram: 'אינסטגרם',
    form: 'טופס',
  },

  /** דפוסי ספאם — פנייה שתואמת אותם מתויגת "לא רלוונטי" ללא מענה אוטומטי. */
  spamPatterns: [
    /\b(?:bitcoin|crypto|forex|casino|viagra|seo services|backlinks)\b/i,
    /https?:\/\/(?:bit\.ly|tinyurl\.com|t\.me)\//i,
    /הלוואה מיידית|הימורים|הגדלת תנועה לאתר/,
  ],
};

export const ESCALATION_REASON = {
  MEDICAL: 'medical',
  COMPLAINT: 'complaint',
  PRICE_NEGOTIATION: 'price_negotiation',
  CANCELLATION_REFUND: 'cancellation_refund',
  PROBLEMATIC_HISTORY: 'problematic_history',
  LOW_CONFIDENCE: 'low_confidence',
};

/** תיאור קריא לכל סיבת הסלמה — נכנס להערות ולהתראה למזכירה. */
export const ESCALATION_REASON_LABEL = {
  [ESCALATION_REASON.MEDICAL]: 'שאלה רפואית',
  [ESCALATION_REASON.COMPLAINT]: 'תלונה או חוסר שביעות רצון',
  [ESCALATION_REASON.PRICE_NEGOTIATION]: 'מחיר/הנחה/משא ומתן',
  [ESCALATION_REASON.CANCELLATION_REFUND]: 'ביטול או החזר',
  [ESCALATION_REASON.PROBLEMATIC_HISTORY]: 'ליד חוזר עם היסטוריה בעייתית',
  [ESCALATION_REASON.LOW_CONFIDENCE]: 'ה-AI לא בטוח בסיווג',
};
