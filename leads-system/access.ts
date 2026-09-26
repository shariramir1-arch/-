// פרטיות והרשאות: גישה לפי תפקיד.
import type { Interaction, Lead } from './schema.ts';
import { CLOSE_REASONS, LEAD_STATUSES } from './schema.ts';

export type Role = 'מזכירה' | 'צוות רפואי' | 'מנהל';

const MEDICAL_FIELDS = [
  'Lead_ID',
  'Name',
  'Phone',
  'Requested_Treatment',
  'Lead_Status',
  'Handling_Mode',
  'Escalation_Reason',
  'Urgency',
  'Appointment_Date',
] as const satisfies readonly (keyof Lead)[];

/** מזכירה – כל השדות התפעוליים; צוות רפואי – מה שנדרש לטיפול; מנהל – דוחות בלבד. */
export function viewLead(lead: Lead, role: Role): Partial<Lead> {
  if (role === 'מזכירה') return { ...lead };
  if (role === 'צוות רפואי') {
    const out: Partial<Lead> = {};
    for (const f of MEDICAL_FIELDS) (out as Record<string, unknown>)[f] = lead[f];
    return out;
  }
  throw new Error('למנהל אין גישה לרשומות בודדות – רק לדוחות');
}

export const REDACTED = '[תוכן רפואי – זמין לצוות הרפואי בלבד]';

export function viewInteractions(list: Interaction[], role: Role): Interaction[] {
  if (role === 'מנהל') throw new Error('למנהל אין גישה להתכתבויות – רק לדוחות');
  if (role === 'צוות רפואי') return list.map((i) => ({ ...i }));
  return list.map((i) => (i.Sensitive ? { ...i, Content: REDACTED } : { ...i }));
}

export interface LeadsReport {
  total: number;
  byStatus: Record<string, number>;
  byCloseReason: Record<string, number>;
  bySource: Record<string, number>;
  escalated: number;
  conversionRate: number;
}

/** דוח מצטבר למנהל – בלי שמות ובלי טלפונים. */
export function buildReport(leads: Lead[]): LeadsReport {
  const byStatus = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0]));
  const byCloseReason = Object.fromEntries(CLOSE_REASONS.map((s) => [s, 0]));
  const bySource: Record<string, number> = {};
  let escalated = 0;
  for (const l of leads) {
    byStatus[l.Lead_Status]++;
    if (l.Close_Reason) byCloseReason[l.Close_Reason]++;
    bySource[l.Source] = (bySource[l.Source] ?? 0) + 1;
    if (l.Escalation_Reason) escalated++;
  }
  return {
    total: leads.length,
    byStatus,
    byCloseReason,
    bySource,
    escalated,
    conversionRate: leads.length ? byStatus['נקבע תור'] / leads.length : 0,
  };
}
