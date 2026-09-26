// ממשקים לתשתית החיצונית (גיליון/DB, ספק WhatsApp, התראות). המנוע לא תלוי במימוש.
import type { Channel, EscalationReason, Interaction, Lead } from './schema.ts';

/** כל קריאה/כתיבה מקבלת actor כדי שהמימוש ינהל לוג "מי קרא/שינה רשומה". */
export interface LeadRepository {
  create(lead: Omit<Lead, 'Lead_ID'>, actor: string): Promise<Lead>;
  update(id: string, patch: Partial<Omit<Lead, 'Lead_ID'>>, actor: string): Promise<Lead>;
  get(id: string, actor: string): Promise<Lead | undefined>;
  findByPhone(phone: string, actor: string): Promise<Lead[]>;
  all(actor: string): Promise<Lead[]>;
  delete(id: string, actor: string): Promise<void>;
}

export interface InteractionRepository {
  add(interaction: Omit<Interaction, 'Interaction_ID'>, actor: string): Promise<Interaction>;
  listByLead(leadId: string, actor: string): Promise<Interaction[]>;
  deleteByLead(leadId: string, actor: string): Promise<void>;
}

export type OutboundMessage =
  | { to: string; channel: Channel; kind: 'text'; text: string }
  /** תבנית מאושרת אצל ספק ה־WhatsApp – לשליחה מחוץ לחלון 24 השעות. */
  | { to: string; channel: Channel; kind: 'template'; templateId: string; params: string[] };

export interface Messenger {
  send(message: OutboundMessage): Promise<void>;
}

export type NotificationKind =
  | 'ליד חדש'
  | 'דורש בדיקה'
  | 'הסלמה'
  | 'הסרה'
  | 'תגובת לקוח'
  | 'נסגר – לא ענה'
  | 'אישור קישור ללקוח קודם'
  | 'הודעה לא נשלחה';

/**
 * התראה מצומצמת (שלב 8): אין כאן שדה לתוכן ההודעה או לפרטים רפואיים – בכוונה.
 * הפרטים המלאים נקראים רק במערכת, עם הרשאה.
 */
export interface StaffNotification {
  kind: NotificationKind;
  audience: 'מזכירה' | 'צוות רפואי';
  leadId: string;
  link: string;
  firstName: string;
  treatmentCategory: string;
  source: Channel;
  escalationReason?: EscalationReason;
  relatedLeadId?: string;
}

export interface Notifier {
  notify(notification: StaffNotification): Promise<void>;
}

export interface Clock {
  now(): Date;
}
