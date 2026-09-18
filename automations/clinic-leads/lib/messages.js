import { CONFIG, ESCALATION_REASON_LABEL } from './config.js';
import { formatForDisplay } from './phone.js';

/**
 * כל הטקסטים שנשלחים החוצה.
 * כלל מחייב: אין מחירים, אין מידע רפואי, אין הבטחת תוצאה — בשום תבנית.
 * מי שרוצה לשנות נוסח, משנה כאן ולא בתוך ה-workflow.
 */

const firstName = (fullName) => String(fullName ?? '').trim().split(' ')[0] || '';

function dateInTimezone(isoString, options) {
  return new Intl.DateTimeFormat('he-IL', { timeZone: CONFIG.timezone, ...options }).format(new Date(isoString));
}

/** "יום ראשון, 20 בספטמבר, 10:30" */
export function formatAppointment(isoString) {
  return dateInTimezone(isoString, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** תגובה ראשונית — אישור קבלה + שאלה אחת לתיאום. */
export function greeting(lead) {
  const name = firstName(lead.fullName);
  const hello = name ? `היי ${name},` : 'היי,';
  const treatment = lead.requestedTreatment && lead.requestedTreatment !== 'לא ידוע'
    ? ` בנוגע ל${lead.requestedTreatment}`
    : '';
  const askPhone = lead.channel === 'instagram' && !lead.phone
    ? '\nכדי שנוכל לתאם, אפשר להשאיר כאן מספר טלפון?'
    : '';
  return (
    `${hello} קיבלנו את הפנייה שלך${treatment} 🙏\n` +
    'נשמח לתאם לך פגישת ייעוץ בקליניקה.\n' +
    'מתי נוח לך שנחזור אליך — בוקר, צהריים או ערב?' +
    askPhone
  );
}

/** מענה יחיד כשהליד מועבר לאדם — ה-AI לא עונה לגופו של עניין. */
export function handoffToHuman() {
  return 'תודה על הפנייה 🙏 מישהו מהצוות יחזור אליך בהקדם.';
}

/** תזכורת מעקב ללקוח שלא ענה. */
export function followupReminder(lead, attempt) {
  const name = firstName(lead.fullName);
  const hello = name ? `היי ${name},` : 'היי,';
  if (attempt <= 1) {
    return `${hello} רק מוודאים שההודעה שלנו הגיעה 🙂\nעדיין מעוניינים שנתאם פגישת ייעוץ? מתי נוח לך?`;
  }
  return (
    `${hello} זו תזכורת אחרונה מצדנו.\n` +
    'אם תרצו לתאם פגישת ייעוץ, פשוט השיבו להודעה הזו ונשמח לחזור אליכם.'
  );
}

/** אישור קביעת תור. */
export function appointmentConfirmation(lead) {
  const name = firstName(lead.fullName);
  const hello = name ? `היי ${name},` : 'היי,';
  return `${hello} התור שלך נקבע ל${formatAppointment(lead.appointmentAt)} ✅\nנשמח לראותך. לשינוי או ביטול — השיבו להודעה הזו.`;
}

/** תזכורת יום לפני התור. */
export function appointmentReminder(lead) {
  const name = firstName(lead.fullName);
  const hello = name ? `היי ${name},` : 'היי,';
  return `${hello} תזכורת לתור שלך מחר, ${formatAppointment(lead.appointmentAt)} 🗓️\nאם צריך לשנות — השיבו להודעה הזו.`;
}

/* ---------- התראות פנימיות למזכירה ---------- */

function leadLine(lead, sheetUrl) {
  const phone = lead.phone ? formatForDisplay(lead.phone) : 'אין טלפון';
  return [
    `שם: ${lead.fullName || 'ללא שם'}`,
    `טלפון: ${phone}`,
    `טיפול: ${lead.requestedTreatment || 'לא ידוע'}`,
    `מקור: ${lead.sourceLabel || CONFIG.channelLabels[lead.channel] || lead.channel}`,
    sheetUrl ? `שורה: ${sheetUrl}` : null,
  ].filter(Boolean).join('\n');
}

export function newLeadAlert(lead, sheetUrl) {
  return `🆕 ליד חדש\n${leadLine(lead, sheetUrl)}`;
}

export function handoffAlert(lead, sheetUrl) {
  const reasons = (lead.escalationReasons ?? [])
    .map((reason) => ESCALATION_REASON_LABEL[reason] ?? reason)
    .join(', ');
  return (
    `🔴 דורש טיפול אנושי${reasons ? ` — ${reasons}` : ''}\n` +
    `${leadLine(lead, sheetUrl)}\n` +
    `הודעת הלקוח: "${lead.originalMessage ?? ''}"`
  );
}

export function invalidLeadAlert(lead, labels, sheetUrl) {
  return `⚠️ פנייה לא תקינה (${labels.join(', ')})\n${leadLine(lead, sheetUrl)}`;
}

export function noAnswerAlert(lead, sheetUrl) {
  return `⏳ ${CONFIG.maxFollowupAttempts} ניסיונות מעקב ללא מענה — הליד נסגר כ"לא רלוונטי"\n${leadLine(lead, sheetUrl)}`;
}

export function returningLeadAlert(lead, sheetUrl) {
  return `🔁 פנייה חוזרת מליד קיים\n${leadLine(lead, sheetUrl)}\nההודעה החדשה: "${lead.originalMessage ?? ''}"`;
}
