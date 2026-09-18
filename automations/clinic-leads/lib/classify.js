import { CONFIG, ESCALATION_REASON } from './config.js';

/**
 * שלב 4 בצינור — סיווג.
 *
 * עיקרון: ה-AI ממיין, מסכם ומנסח — לא מייעץ.
 * לכן ההסלמה לא נשענת רק על שיקול דעת של המודל: יש כאן שכבת כללים
 * דטרמיניסטית שרצה לפני ואחרי ה-AI. גם אם המודל יחליט שהכול תקין,
 * מילה כמו "בהריון" או "החזר כספי" מעבירה את הליד לאדם.
 */

/** רשימת הטיפולים שהקליניקה מציעה — לעריכה לפי הקליניקה בפועל. */
export const TREATMENTS = [
  'בוטוקס',
  'חומצה היאלורונית',
  'מילוי שפתיים',
  'לייזר להסרת שיער',
  'טיפולי פנים',
  'פילינג',
  'מזותרפיה',
  'הסרת קעקועים',
  'טיפול אקנה',
  'אחר',
];

export const URGENCY = ['נמוכה', 'בינונית', 'גבוהה'];

/** דפוסים שמחייבים העברה לאדם, ללא קשר לדעת המודל. */
const ESCALATION_PATTERNS = [
  {
    reason: ESCALATION_REASON.MEDICAL,
    pattern:
      /בהריון|הריון|מניקה|הנקה|תרופ|אנטיביוטי|רואקוטן|איזוטרטינואין|מדלל(?:י)? דם|תופעות לוואי|אלרגי|סוכרת|יתר לחץ דם|אוטואימונ|מחלת עור|זיהום|כוויה|קוצב לב|ניתוח|מתאים לי|האם מותר|בטוח לי|סיכון|לאחר לידה|מחלה/,
  },
  {
    reason: ESCALATION_REASON.COMPLAINT,
    pattern: /תלונה|לא מרוצ|לא הייתי מרוצ|מאוכזב|גרוע|נזק|התוצאה לא|החמיר|טעות שלכם|כאב לי מאז|לא עבד/,
  },
  {
    reason: ESCALATION_REASON.PRICE_NEGOTIATION,
    pattern: /הנחה|יקר מדי|להוזיל|לשלם פחות|משא ומתן|מחיר מיוחד|תשלומים|מבצע מיוחד|הצעה טובה יותר/,
  },
  {
    reason: ESCALATION_REASON.CANCELLATION_REFUND,
    pattern: /לבטל|ביטול|החזר כספי|כסף בחזרה|זיכוי|לדחות את התור/,
  },
];

/** שאלת מחיר "רגילה" — לא מסלימה, אבל ה-AI לא נוקב במחיר והמזכירה מקבלת ציון לכך. */
const PRICE_QUESTION = /כמה עולה|מה המחיר|מחירון|עלות|כמה זה/;

/**
 * כללים שרצים על הטקסט בלבד.
 * @param {string} text
 * @returns {string[]} סיבות הסלמה
 */
export function detectEscalationInText(text = '') {
  const value = String(text);
  return ESCALATION_PATTERNS.filter(({ pattern }) => pattern.test(value)).map(({ reason }) => reason);
}

export function mentionsPrice(text = '') {
  return PRICE_QUESTION.test(String(text));
}

/** סכמת הפלט של המודל — JSON בלבד, ללא טקסט חופשי. */
export const CLASSIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    requestedTreatment: { type: 'string', enum: TREATMENTS, description: 'הטיפול המבוקש' },
    urgency: { type: 'string', enum: URGENCY },
    requiresHuman: { type: 'boolean', description: 'האם נדרש טיפול של אדם' },
    escalationReasons: {
      type: 'array',
      items: { type: 'string', enum: Object.values(ESCALATION_REASON) },
    },
    summary: { type: 'string', description: 'סיכום הפנייה במשפט אחד, ללא פרשנות רפואית' },
    confidence: { type: 'number', description: 'ביטחון בסיווג, 0 עד 1' },
  },
  required: ['requestedTreatment', 'urgency', 'requiresHuman', 'escalationReasons', 'summary', 'confidence'],
};

export const CLASSIFIER_SYSTEM_PROMPT = `אתה מסווג פניות עבור קליניקה לרפואה אסתטית.
תפקידך: למיין, לסכם ולחלץ מידע — לא לייעץ ולא לענות ללקוח.

חוקים מוחלטים:
1. אינך נותן מידע רפואי, אינך קובע התאמה לטיפול ואינך מעריך תוצאה צפויה.
2. אינך נוקב במחירים, בהנחות או בתנאי תשלום.
3. בכל אחד מהמקרים הבאים requiresHuman=true והסיבה נרשמת ב-escalationReasons:
   - medical: שאלה רפואית כלשהי — התאמה לטיפול, תופעות לוואי, הריון/הנקה, תרופות, מחלות רקע.
   - complaint: תלונה או חוסר שביעות רצון מטיפול קודם.
   - price_negotiation: בקשת הנחה, משא ומתן או בקשת מחיר חריגה.
   - cancellation_refund: בקשת ביטול או החזר.
   - problematic_history: הפנייה מציינת היסטוריה בעייתית מול הקליניקה.
   - low_confidence: אינך בטוח בסיווג.
4. אם אינך בטוח — confidence נמוך מ-0.7 ו-requiresHuman=true. עדיף להעביר לאדם מאשר לנחש.
5. requestedTreatment חייב להיות אחד מהערכים המותרים; אם לא ברור, בחר "אחר".
6. summary הוא משפט אחד ענייני בעברית, ללא אבחנה ובלי המלצה.

החזר JSON תקין בלבד, ללא טקסט לפניו או אחריו, ללא סימוני קוד.`;

/**
 * בניית ההודעה למודל.
 * @param {import('./normalize.js').InboundLead} lead
 * @param {{isReturning?: boolean, previousNotes?: string}} [context]
 */
export function buildClassifierPrompt(lead, context = {}) {
  const lines = [
    `מקור הפנייה: ${lead.channelLabel ?? lead.channel}`,
    `שם: ${lead.fullName || 'לא ידוע'}`,
    lead.treatmentHint ? `טיפול שנבחר בטופס: ${lead.treatmentHint}` : null,
    context.isReturning ? 'זהו ליד קיים שפנה שוב.' : null,
    context.previousNotes ? `הערות קודמות: ${context.previousNotes}` : null,
    '',
    'תוכן הפנייה:',
    `"""${lead.messageText ?? ''}"""`,
    '',
    `ערכים מותרים ל-requestedTreatment: ${TREATMENTS.join(' | ')}`,
    `ערכים מותרים ל-urgency: ${URGENCY.join(' | ')}`,
  ].filter((line) => line !== null);

  return {
    system: CLASSIFIER_SYSTEM_PROMPT,
    user: lines.join('\n'),
    schema: CLASSIFICATION_SCHEMA,
  };
}

/** המודל עלול להחזיר ```json ...``` למרות ההוראה — כאן מנקים ומפענחים. */
export function parseClassifierOutput(raw) {
  if (raw && typeof raw === 'object') return raw;
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const withoutFence = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(withoutFence.slice(start, end + 1));
  } catch {
    return null;
  }
}

function sanitizeTreatment(value, hint) {
  if (TREATMENTS.includes(value)) return value;
  if (hint && TREATMENTS.includes(hint)) return hint;
  return 'אחר';
}

/**
 * מיזוג פלט ה-AI עם הכללים הדטרמיניסטיים. זו הפונקציה שמכריעה.
 *
 * @param {Object|string|null} aiOutput  פלט גולמי מהמודל (או null אם הקריאה נכשלה)
 * @param {import('./normalize.js').InboundLead} lead
 * @param {{problematicHistory?: boolean}} [context]
 * @returns {{requestedTreatment: string, urgency: string, requiresHuman: boolean,
 *            escalationReasons: string[], confidence: number, summary: string,
 *            mentionsPrice: boolean, aiFailed: boolean}}
 */
export function resolveClassification(aiOutput, lead, context = {}) {
  const parsed = parseClassifierOutput(aiOutput);
  const aiFailed = parsed === null;

  const text = `${lead?.messageText ?? ''} ${lead?.treatmentHint ?? ''}`;
  const reasons = new Set(detectEscalationInText(text));

  for (const reason of parsed?.escalationReasons ?? []) {
    if (Object.values(ESCALATION_REASON).includes(reason)) reasons.add(reason);
  }

  if (context.problematicHistory) reasons.add(ESCALATION_REASON.PROBLEMATIC_HISTORY);

  const rawConfidence = Number(parsed?.confidence);
  const confidence = aiFailed || !Number.isFinite(rawConfidence)
    ? 0
    : Math.min(Math.max(rawConfidence, 0), 1);

  if (aiFailed || confidence < CONFIG.minClassificationConfidence) {
    reasons.add(ESCALATION_REASON.LOW_CONFIDENCE);
  }

  const escalationReasons = [...reasons];

  return {
    requestedTreatment: sanitizeTreatment(parsed?.requestedTreatment, lead?.treatmentHint),
    urgency: URGENCY.includes(parsed?.urgency) ? parsed.urgency : 'בינונית',
    requiresHuman: escalationReasons.length > 0 || parsed?.requiresHuman === true,
    escalationReasons,
    confidence,
    summary: String(parsed?.summary ?? '').trim() || String(lead?.messageText ?? '').slice(0, 140),
    mentionsPrice: mentionsPrice(text),
    aiFailed,
  };
}
