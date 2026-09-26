// שלב 5 – סיווג AI. ה־AI ממיין ומסכם בלבד; פלט שאינו JSON תקין = "AI לא בטוח".
import type { Classification, EscalationReason, Urgency } from './schema.ts';
import { ESCALATION_REASONS } from './schema.ts';

export interface Classifier {
  classify(input: { text: string; channel: string; treatmentHint: string }): Promise<string | Classification>;
}

export function buildClassifierPrompt(treatments: readonly string[]): string {
  return `אתה רכיב מיון לידים במרפאה. אתה לא יועץ, לא מאבחן ולא עונה ללקוח.
המשימה: לקרוא פנייה נכנסת ולהחזיר JSON בלבד, בלי טקסט נוסף, במבנה:
{"treatment": string, "urgency": "נמוכה"|"בינונית"|"גבוהה", "escalate": boolean,
 "escalation_reason": ${ESCALATION_REASONS.map((r) => `"${r}"`).join('|')}|null,
 "confidence": number בין 0 ל־1, "summary": string}

כללים:
- "treatment" חייב להיות אחד מהערכים: ${[...treatments, 'לא ידוע'].map((t) => `"${t}"`).join(', ')}.
- escalate=true בכל אחד מהמקרים: שאלה רפואית (מצב בריאותי, תרופות, הריון, תופעות לוואי, התאמה לטיפול) → "רפואי";
  תלונה → "תלונה"; בקשת הנחה/מחיר מיוחד → "מחיר חריג"; ביטול או החזר → "ביטול/החזר"; כל ספק → "AI לא בטוח".
- "summary": משפט אחד, עד 15 מילים, בלי פרטים רפואיים ובלי ציטוט של הלקוח.
- אל תנסח תשובה ללקוח, אל תציין מחירים ואל תבטיח תוצאה.`;
}

const URGENCIES: readonly Urgency[] = ['נמוכה', 'בינונית', 'גבוהה'];

export const UNSURE: Classification = {
  treatment: 'לא ידוע',
  urgency: 'בינונית',
  escalate: true,
  escalation_reason: 'AI לא בטוח',
  confidence: 0,
  summary: '',
};

/** מאמת את פלט המודל. כל חריגה מהסכמה מחזירה UNSURE (הסלמה לאדם). */
export function parseClassification(raw: unknown, treatments: readonly string[]): Classification {
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return UNSURE;
    try {
      obj = JSON.parse(m[0]);
    } catch {
      return UNSURE;
    }
  }
  if (!obj || typeof obj !== 'object') return UNSURE;
  const o = obj as Record<string, unknown>;

  const confidence = typeof o.confidence === 'number' && o.confidence >= 0 && o.confidence <= 1 ? o.confidence : null;
  if (confidence === null || typeof o.escalate !== 'boolean') return UNSURE;

  const reason = o.escalation_reason;
  if (reason !== null && reason !== undefined && !ESCALATION_REASONS.includes(reason as EscalationReason)) return UNSURE;

  const treatment = typeof o.treatment === 'string' && treatments.includes(o.treatment) ? o.treatment : 'לא ידוע';
  const urgency = URGENCIES.includes(o.urgency as Urgency) ? (o.urgency as Urgency) : 'בינונית';
  const summary = typeof o.summary === 'string' ? o.summary.slice(0, 120) : '';

  return {
    treatment,
    urgency,
    escalate: o.escalate,
    escalation_reason: o.escalate ? ((reason as EscalationReason | null) ?? 'AI לא בטוח') : null,
    confidence,
    summary,
  };
}
