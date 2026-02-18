import { AdvancedUseCase } from '../types';

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
