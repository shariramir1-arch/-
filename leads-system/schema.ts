// מבנה הנתונים של מערכת ניהול הלידים – ראו SPEC.md, סעיף "מבנה נתונים".

export const LEAD_STATUSES = ['חדש', 'דורש בדיקה', 'בטיפול', 'נקבע תור', 'נסגר'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const CLOSE_REASONS = ['לא רלוונטי', 'לא ענה', 'ביקש הסרה'] as const;
export type CloseReason = (typeof CLOSE_REASONS)[number];

export const HANDLING_MODES = ['AI', 'מזכירה', 'צוות רפואי'] as const;
export type HandlingMode = (typeof HANDLING_MODES)[number];

// סדר המערך = סדר עדיפות כשמתקיימות כמה סיבות בו־זמנית.
export const ESCALATION_REASONS = ['רפואי', 'תלונה', 'ביטול/החזר', 'מחיר חריג', 'AI לא בטוח'] as const;
export type EscalationReason = (typeof ESCALATION_REASONS)[number];

export type Channel = 'whatsapp' | 'instagram' | 'form';
export type Direction = 'נכנס' | 'יוצא';
export type ActionType = 'פנייה' | 'תגובה אוטומטית' | 'מעקב' | 'שיחת מזכירה' | 'קביעת תור';

/** "שיחה בלבד" = פנייה יזומה בוואטסאפ/אינסטגרם; "מלאה" = checkbox בטופס. */
export type ConsentScope = 'מלאה' | 'שיחה בלבד';

export type Urgency = 'נמוכה' | 'בינונית' | 'גבוהה';

/** סטטוסים שבהם הודעה נוספת מאותו טלפון מצורפת לליד הקיים. */
export const OPEN_STATUSES: readonly LeadStatus[] = ['חדש', 'דורש בדיקה', 'בטיפול', 'נקבע תור'];

export interface Lead {
  Lead_ID: string;
  Name: string;
  /** מנורמל (E.164), משמש לאיתור התאמות בלבד. ריק כשהטלפון חסר/שגוי. */
  Phone: string;
  Source: Channel;
  Requested_Treatment: string;
  Inquiry_Date: string;
  Lead_Status: LeadStatus;
  Close_Reason: CloseReason | '';
  Handling_Mode: HandlingMode;
  Escalation_Reason: EscalationReason | '';
  Urgency: Urgency;
  Next_Follow_Up: string | null;
  Follow_Up_Attempts: number;
  Appointment_Date: string | null;
  Reminder_Sent: boolean;
  Consent: boolean;
  Consent_Scope: ConsentScope | '';
  Consent_Date: string | null;
  Opt_Out: boolean;
  /** לקוח חוזר / מספר משותף – קישור לליד קודם, ממתין לאישור מזכירה. */
  Related_Lead_ID: string;
  Related_Lead_Approved: boolean;
  Notes: string;
  Last_Inbound_At: string | null;
  Updated_At: string;
  /** מסומן במחיקה/הסתרה לפי מדיניות השמירה. */
  Archived: boolean;
}

export interface Interaction {
  Interaction_ID: string;
  Lead_ID: string;
  Channel: Channel;
  Direction: Direction;
  Content: string;
  Date: string;
  Action_Type: ActionType;
  /** תוכן רפואי – נחשף רק לצוות הרפואי. */
  Sensitive: boolean;
}

/** פלט JSON של סיווג ה־AI (שלב 5). */
export interface Classification {
  treatment: string;
  urgency: Urgency;
  escalate: boolean;
  escalation_reason: EscalationReason | null;
  confidence: number;
  summary: string;
}

export interface AuditEntry {
  at: string;
  actor: string;
  action: 'read' | 'create' | 'update' | 'delete';
  table: 'Leads' | 'Interactions';
  recordId: string;
  fields?: string[];
}
