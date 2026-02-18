import { Slide } from '../types';

export const SLIDES_DATA: Slide[] = [
  {
    id: 1,
    title: "מערכות מידע ובינה מלאכותית",
    subtitle: "הדרכה מקצועית להטמעה ויישום בארגון",
    content: ["מרצה ומדריך טכנולוגי בכיר", "אסטרטגיה וחדשנות עסקית", "יישום מעשי של כלי AI"],
    type: 'standard',
    icon: 'Brain'
  },
  {
    id: 2,
    title: "הקדמה לנושא המידע",
    subtitle: "הבנה בסיסית של מושגי יסוד",
    content: [
      "מידע = נתונים מעובדים בעלי משמעות",
      "מערכת מידע = אוסף רכיבים (אנשים, תהליכים, טכנולוגיה)",
      "חשיבות: בסיס לקבלת החלטות מושכלות",
      "תהליך: נתונים -> מידע -> ידע"
    ],
    type: 'standard',
    icon: 'Database'
  },
  {
    id: 3,
    title: "מהי מערכת מידע?",
    subtitle: "הגדרה ומטרה",
    content: [
      "מערכת מידע אוספת, מעבדת, שומרת ומשדרת מידע בארגון.",
      "מטרה: תמיכה בקבלת החלטות וניהול תהליכים.",
      "שילוב של חומרה, תוכנה והון אנושי."
    ],
    type: 'diagram',
    icon: 'Server'
  },
  {
    id: 4,
    title: "סוגי מערכות מידע",
    subtitle: "ERP, CRM, BI, HRMS",
    content: [],
    type: 'table',
    tableData: [
      { col1: "ERP", col2: "Enterprise Resource Planning", col3: "ניהול משאבים ארגוניים", col4: "SAP, Priority" },
      { col1: "CRM", col2: "Customer Relationship Management", col3: "ניהול קשרי לקוחות", col4: "Salesforce" },
      { col1: "BI", col2: "Business Intelligence", col3: "ניתוח נתונים עסקיים", col4: "Power BI, Tableau" },
      { col1: "HRMS", col2: "Human Resource Management", col3: "ניהול משאבי אנוש", col4: "Workday" }
    ],
    icon: 'Boxes'
  },
  {
    id: 6,
    title: "תרומת מערכות מידע",
    subtitle: "התייעלות ארגונית",
    content: [
      "💰 חיסכון משמעותי במשאבים",
      "⏱ קיצור זמני תהליכים (מ-3 ימים ל-30 דקות)",
      "👁 שקיפות מלאה לכל הדרגים",
      "⚡ קבלת החלטות מהירה מבוססת נתונים"
    ],
    type: 'standard',
    icon: 'Zap'
  },
  {
    id: 7,
    title: "שילוב בינה מלאכותית",
    subtitle: "ערך מוסף למערכות מידע",
    content: [
      "🔍 זיהוי מגמות נסתרות בנתונים",
      "📈 תחזית עסקית (Predictive Analytics)",
      "🤖 אוטומציה חכמה של תהליכים מורכבים"
    ],
    type: 'standard',
    icon: 'Brain'
  },
  {
    id: 8,
    title: "בינה מלאכותית בעסקים",
    subtitle: "מנוע חדשנות מודרני",
    content: [
      '"AI היא הדיגיטציה החכמה של המאה ה-21"',
      "מעבר מאוטומציה פשוטה לאוטומציה קוגניטיבית",
      "יצירת יתרון תחרותי מובהק"
    ],
    type: 'quote',
    icon: 'Bot'
  },
  {
    id: 11,
    title: "אתגרים בהטמעת AI",
    subtitle: "נקודות למחשבה וניהול סיכונים",
    content: [
      "💰 משאבים כספיים וטכנולוגיים נדרשים",
      "🔄 התאמת תהליכים קיימים לשיטות עבודה חדשות",
      "🔒 פרטיות ואבטחת מידע (Data Privacy)",
      "👥 התמודדות עם התנגדויות עובדים לשינוי"
    ],
    type: 'standard',
    icon: 'ShieldAlert'
  },
  {
    id: 19,
    title: "תעודת סיום",
    subtitle: "הכשרה: מערכות מידע ובינה מלאכותית",
    content: [
      "ברכות! השלמת בהצלחה את ההדרכה.",
      "רכשת ידע ביישום מערכות מתקדמות.",
      "הכלים שבידך: ERP, AI, ואוטומציה."
    ],
    type: 'final',
    icon: 'Award'
  }
];
