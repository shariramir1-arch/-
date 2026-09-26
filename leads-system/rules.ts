// כללי ניתוב דטרמיניסטיים. הם נאכפים בקוד, בלי תלות בהנחיית ה־AI.
import type { InboundMessage } from './normalize.ts';
import type { Classification, EscalationReason, HandlingMode, Lead } from './schema.ts';
import { ESCALATION_REASONS, OPEN_STATUSES } from './schema.ts';

const HOUR = 60 * 60 * 1000;
export const MESSAGING_WINDOW_MS = 24 * HOUR;

// ---------- שלב 2: בדיקת תקינות ----------

export type ValidationIssue = 'טלפון חסר או שגוי' | 'תוכן ריק';

export function validateInbound(msg: InboundMessage): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!msg.phone) issues.push('טלפון חסר או שגוי');
  if (!msg.text && !msg.requestedTreatment) issues.push('תוכן ריק');
  return issues;
}

// ---------- שלב 3: Opt-Out ----------

// ביטויים מפורשים בלבד: "הסרת שיער" / "הסרת קעקוע" הם טיפולים, לא בקשת הסרה.
const OPT_OUT_EXACT = new Set(['הסר', 'הסרה', 'הסירו', 'תסירו', 'stop', 'unsubscribe', 'להסרה']);
const OPT_OUT_PHRASES = [
  /(הסר|הסירו|הסירי|תסירו|תסירי|להסיר)\s+(אותי|אותנו|את\s+המספר)/,
  /(הסר|הסירו|הסירי|תסירו|להסיר)\s+(אותי\s+)?מה?(רשימה|רשימת|תפוצה)/,
  /אל\s+(ת(פנו|פני|שלחו|שלחי|תקשרו|תקשרי))\s+(אליי|אלי|לי|אלינו|לנו)/,
  /(תפסיקו|תפסיקי|הפסיקו)\s+(לשלוח|לפנות|להתקשר)/,
  /לא\s+(לשלוח|לפנות)\s+(אליי|אלי|לי)\s+(יותר|שוב)/,
];

export function isOptOut(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/[.!,?\s]+$/g, '');
  if (!t) return false;
  if (OPT_OUT_EXACT.has(t)) return true;
  return OPT_OUT_PHRASES.some((re) => re.test(t));
}

// ---------- שלב 4: איתור התאמה ----------

export type MatchDecision =
  | { kind: 'new' }
  | { kind: 'attach'; lead: Lead }
  | { kind: 'new-linked'; previous: Lead };

const UNKNOWN_TREATMENT = new Set(['', 'לא ידוע', 'כללי']);

export function sameTreatment(a: string, b: string): boolean {
  if (UNKNOWN_TREATMENT.has(a) || UNKNOWN_TREATMENT.has(b)) return true;
  return a.trim() === b.trim();
}

/** leadsForPhone – כל הלידים עם אותו טלפון מנורמל. */
export function decideMatch(leadsForPhone: Lead[], treatment: string): MatchDecision {
  const live = leadsForPhone.filter((l) => !l.Archived);
  if (live.length === 0) return { kind: 'new' };
  const latest = [...live].sort((a, b) => b.Inquiry_Date.localeCompare(a.Inquiry_Date))[0];
  const open = live.find((l) => OPEN_STATUSES.includes(l.Lead_Status) && sameTreatment(l.Requested_Treatment, treatment));
  if (open) return { kind: 'attach', lead: open };
  return { kind: 'new-linked', previous: latest };
}

// ---------- שלב 5 / הסלמה ----------

// רשת ביטחון מבוססת מילות מפתח: יכולה רק להוסיף הסלמה, לעולם לא לבטל הסלמה של ה־AI.
const ESCALATION_KEYWORDS: Record<Exclude<EscalationReason, 'AI לא בטוח'>, RegExp> = {
  'רפואי':
    /(תופעות\s+לוואי|תופעת\s+לוואי|כאב|כואב|דימום|מדמם|נפיחות|נפוח|זיהום|אלרגי|הריון|בהריון|מניקה|הנקה|תרופ|מדלל|סוכרת|לחץ\s+דם|כוויה|אדמומיות|פריחה|מסוכן|בטוח\s+ל)/,
  'תלונה': /(תלונה|להתלונן|לא\s+מרוצ|מאוכזב|גרוע|שערורי|עורך\s+דין|עו"ד|תביעה|רשלנות)/,
  'ביטול/החזר': /(החזר\s+כספי|החזר|זיכוי|לבטל|ביטול|תבטלו)/,
  'מחיר חריג': /(הנחה|מבצע\s+מיוחד|יותר\s+זול|להוריד\s+(את\s+)?המחיר|מחיר\s+מיוחד|תשלומים\s+ללא)/,
};

export const MIN_CONFIDENCE = 0.7;

/** מחזיר את סיבת ההסלמה בעלת העדיפות הגבוהה ביותר, או null. */
export function decideEscalation(text: string, c: Classification): EscalationReason | null {
  const reasons = new Set<EscalationReason>();
  if (c.escalate) reasons.add(c.escalation_reason ?? 'AI לא בטוח');
  for (const [reason, re] of Object.entries(ESCALATION_KEYWORDS)) {
    if (re.test(text)) reasons.add(reason as EscalationReason);
  }
  if (c.confidence < MIN_CONFIDENCE) reasons.add('AI לא בטוח');
  return ESCALATION_REASONS.find((r) => reasons.has(r)) ?? null;
}

export function handlingModeFor(reason: EscalationReason): HandlingMode {
  return reason === 'רפואי' ? 'צוות רפואי' : 'מזכירה';
}

// ---------- שלב 9: מעקב ----------

export const MAX_FOLLOW_UPS = 2;

export type FollowUpDecision = 'skip' | 'send' | 'close-no-answer';

export function decideFollowUp(lead: Lead, now: Date): FollowUpDecision {
  if (lead.Archived || lead.Opt_Out) return 'skip';
  if (lead.Lead_Status !== 'בטיפול' || lead.Handling_Mode !== 'AI') return 'skip';
  if (!lead.Next_Follow_Up || new Date(lead.Next_Follow_Up) > now) return 'skip';
  if (lead.Follow_Up_Attempts >= MAX_FOLLOW_UPS) return 'close-no-answer';
  if (!lead.Consent) return 'skip';
  return 'send';
}

/**
 * חלון השירות של WhatsApp/Instagram: 24 שעות מההודעה הנכנסת האחרונה.
 * מחוצה לו – רק תבנית מאושרת. ליד מטופס מעולם לא פתח חלון.
 */
export function withinMessagingWindow(lead: Lead, now: Date): boolean {
  if (lead.Source === 'form' || !lead.Last_Inbound_At) return false;
  return now.getTime() - new Date(lead.Last_Inbound_At).getTime() < MESSAGING_WINDOW_MS;
}

export function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * HOUR).toISOString();
}
