

import { Slide, AdvancedUseCase, ServiceDetail } from './types';

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

export const ADVANCED_CASES: AdvancedUseCase[] = [
  {
    id: 1,
    title: "סוכני ידע ארגוניים",
    system: "RAG + LLM Integration",
    description: "סוכני ידע ארגוניים המנגישים מידע טכני, נהלים ודוחות היסטוריים בשפה טבעית.",
    benefit: "חיסכון של 40% בזמן חיפוש מידע",
    icon: "MessageSquare",
    challenge: "עובדים מבזבזים שעות בחיפוש מסמכים בשרתים, ב-SharePoint ובמיילים ישנים. הידע הארגוני מבוזר ולא נגיש.",
    solution: "הטמעת ארכיטקטורת RAG (Retrieval-Augmented Generation) המאנדקסת את כלל מסמכי הארגון. יצירת בוט ב-Teams/Slack המאפשר לשאול שאלות ולקבל תשובות מדויקות עם הפניות למקור.",
    impact: "קיצור זמן הכשרת עובד חדש ב-60%, מענה מיידי ללקוחות ע\"י נציגי שירות, ושימור ידע קריטי.",
    techStack: ["LangChain", "Pinecone (Vector DB)", "OpenAI / Gemini API", "Python Backend"]
  },
  {
    id: 2,
    title: "בקרת איכות ויזואלית",
    system: "Computer Vision + Edge AI",
    description: "בקרת איכות ויזואלית אוטומטית בקו הייצור לזיהוי פגמים בזמן אמת.",
    benefit: "99.9% דיוק בזיהוי תקלות ייצור",
    icon: "Eye",
    challenge: "בקרת איכות ידנית היא איטית, יקרה ומועדת לטעויות אנוש. החזרות מוצרים פוגעות במוניטין וברווחיות.",
    solution: "התקנת מצלמות חכמות בקו הייצור המחוברות למודל Deep Learning שאומן על אלפי תמונות של מוצרים תקינים ופגומים. המערכת עוצרת את הקו או מתריעה למפעיל בזמן אמת.",
    impact: "צמצום פחת (Waste) ב-15%, מניעת משלוח מוצרים פגומים ללקוח, ותיעוד דיגיטלי מלא של כל פריט.",
    techStack: ["YOLOv8", "OpenCV", "NVIDIA Jetson", "TensorFlow"]
  },
  {
    id: 3,
    title: "אופטימיזציה חכמה לתהליכים",
    system: "Process Mining + AI",
    description: "ניתוח לוגים מערכתיים לזיהוי צווארי בקבוק וחיזוי עיכובים בתהליכים.",
    benefit: "ייעול תהליכי ליבה ב-30%",
    icon: "Workflow",
    challenge: "מנהלים לא רואים את התמונה המלאה של תהליכי הרכש והלוגיסטיקה. תהליכים נתקעים ללא סיבה ברורה.",
    solution: "שימוש בכלי Process Mining השואבים לוגים מה-ERP, בשילוב אלגוריתמים לזיהוי חריגות (Anomaly Detection). המערכת מציגה ויזואליזציה של זרימת העבודה וממליצה על קיצורי דרך.",
    impact: "קיצור Cycle Time של הזמנות רכש, שקיפות מלאה להנהלה, וזיהוי הונאות או חריגות נהלים.",
    techStack: ["Celonis / Custom Python", "Pandas", "Scikit-learn", "Power BI Integration"]
  },
  {
    id: 4,
    title: "אחזקה חזויה 4.0",
    system: "IoT + Predictive ML",
    description: "חיזוי תקלות במכונות תעשייתיות למניעת השבתות לא מתוכננות.",
    benefit: "אפס השבתות ייצור מפתיעות",
    icon: "Activity",
    challenge: "תקלות פתאומיות במנועים ומסועים גורמות לעצירת מפעל שלמה ולהפסדים של מיליוני שקלים.",
    solution: "חיבור חיישני רעידות וטמפרטורה (IoT) למנוע AI המנתח דפוסים בזמן אמת. המודל מזהה שחיקה חריגה שבועות לפני הכשל ומתריע למנהל האחזקה.",
    impact: "מעבר מאחזקת שבר לאחזקה מונעת, הארכת חיי הציוד ב-20%, והפחתת עלויות מלאי חלפים.",
    techStack: ["Azure IoT Hub", "Time Series Analysis", "Keras/TensorFlow", "MQTT"]
  },
  {
    id: 5,
    title: "סוכן תמחור דינמי",
    system: "Reinforcement Learning",
    description: "מנוע תמחור דינמי הלומד את השוק ומתאים מחירים למקסום רווח.",
    benefit: "עלייה של 12-18% ברווחיות",
    icon: "ShoppingCart",
    challenge: "התמחור באתרי e-Commerce וקמעונאות הוא סטטי ולא מגיב מהר מספיק לשינויי ביקוש או למתחרים.",
    solution: "סוכן Reinforcement Learning שמבצע ניסויים (A/B Testing) בזמן אמת, לומד את גמישות הביקוש של כל מוצר ומתאים את המחיר האופטימלי לכל שעה ביום.",
    impact: "מקסום המרווח (Margin) ללא פגיעה בנפח המכירות, ותגובה אוטומטית למבצעי מתחרים.",
    techStack: ["Reinforcement Learning (RL)", "Python", "Redis", "Real-time Data Stream"]
  },
  {
    id: 6,
    title: "תאום דיגיטלי תעשייתי",
    system: "Simulation & Generative Design",
    description: "יצירת תאום דיגיטלי למפעל או קו יצור לביצוע סימולציות.",
    benefit: "קיצור Time-to-Market למוצרים חדשים",
    icon: "Boxes",
    challenge: "שינויים בקו הייצור דורשים השבתה פיזית וניסוי וטעייה יקרים.",
    solution: "בניית מודל תלת-ממדי חי של המפעל המסונכרן עם הנתונים האמיתיים. שימוש ב-AI להרצת אלפי תרחישים ('מה יקרה אם') למציאת הקונפיגורציה היעילה ביותר.",
    impact: "בדיקת היתכנות למוצרים חדשים ללא סיכון, אופטימיזציה של צריכת אנרגיה, והדרכת עובדים ב-VR.",
    techStack: ["NVIDIA Omniverse", "Unity 3D", "Physics ML", "Digital Twin Platform"]
  }
];

export const SERVICE_DETAILS: Record<string, ServiceDetail> = {
  lectures: {
    id: 'lectures',
    title: 'הרצאות Executive וסדנאות AI',
    subtitle: 'ידע אסטרטגי להנהלה ולצוותים מקצועיים',
    description: 'סדרת הרצאות מעוררות השראה המנגישות את עולם הבינה המלאכותית לדרג הניהולי והמקצועי, עם דגש על יישום מיידי וערך עסקי.',
    features: [
      "מהפכת ה-Generative AI: סקירה אסטרטגית, הזדמנויות וסיכונים.",
      "ארגז הכלים של המנכ\"ל החדש: שימוש מתקדם ב-Copilot, GPT, Claude.",
      "אוטומציה עסקית (RPA & AI): איך לחסוך 40% מזמן העבודה האדמיניסטרטיבי.",
      "סדנת Prompt Engineering מעשית לשיפור תפוקת הצוות.",
      "אתיקה ורגולציה: שימוש בטוח בבינה מלאכותית בארגון."
    ],
    iconKey: 'Mic',
    ctaText: 'הזמן הרצאה לארגון'
  },
  development: {
    id: 'development',
    title: 'פיתוח סוכני AI (Agents)',
    subtitle: 'כוח עבודה דיגיטלי חכם',
    description: 'פיתוח והטמעה של סוכנים אוטונומיים המותאמים אישית לצרכי הארגון. הסוכנים משתלבים במערכות ה-IT הקיימות ומבצעים משימות מורכבות.',
    features: [
      "סוכן שירות לקוחות 24/7: מענה אנושי, מחובר ל-CRM ולבסיס הידע.",
      "אנליסט נתונים אוטונומי: הפקת תובנות עמוקות מדוחות Excel/SQL.",
      "סוכן מכירות ולידים (SDR): טיוב לידים ופניה יזומה ללקוחות פוטנציאליים.",
      "עוזר אישי למנהל (Executive Assistant): ניהול יומן, סיכום פגישות ומיילים.",
      "בוט פנים-ארגוני (HR/IT): אוטומציה של תהליכי קליטת עובדים ותמיכה טכנית."
    ],
    iconKey: 'Code',
    ctaText: 'אפיין סוכן חכם'
  },
  consulting: {
    id: 'consulting',
    title: 'ייעוץ אסטרטגי וליווי טכנולוגי',
    subtitle: 'מפת הדרכים שלך לארגון מבוסס AI',
    description: 'תהליך ליווי מובנה להפיכת הארגון ל-AI First Organization. משלב המיפוי הראשוני ועד להטמעה המלאה בכל מחלקות הארגון.',
    features: [
      "מיפוי תהליכים עסקיים (Business Process Mapping) ובחינת היתכנות ל-AI.",
      "בניית אסטרטגיית דאטה: ארגון המידע כך שמודלים יוכלו ללמוד ממנו.",
      "בחירת ספקים וטכנולוגיות: המלצה אובייקטיבית על הכלים המתאימים ביותר.",
      "בניית POC (הוכחת היתכנות) מהירה לבחינת ROI.",
      "הדרכת צוותים וליווי שינוי ארגוני להטמעה חלקה."
    ],
    iconKey: 'Lightbulb',
    ctaText: 'תיאום פגישת ייעוץ'
  }
};