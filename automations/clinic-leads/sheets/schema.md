<!-- נוצר אוטומטית מ-lib/record.js — אין לערוך ידנית. הרצה: npm run build:automation -->

# מבנה הגיליון

שורה 1 היא שורת הכותרות, בדיוק בסדר הזה. `מפתח ליד` היא עמודת ההתאמה
שכל פעולות העדכון מסתמכות עליה — אין לשנות את שמה או את מיקומה.

| # | עמודה | שדה בקוד |
| - | ----- | -------- |
| 1 | מפתח ליד | `leadKey` |
| 2 | שם מלא | `fullName` |
| 3 | טלפון | `phone` |
| 4 | מקור הפנייה | `source` |
| 5 | טיפול מבוקש | `requestedTreatment` |
| 6 | תוכן הפנייה המקורי | `originalMessage` |
| 7 | תאריך ושעת פנייה | `receivedAt` |
| 8 | סטטוס | `status` |
| 9 | מועד מעקב הבא | `nextFollowupAt` |
| 10 | ניסיונות מעקב | `followupAttempts` |
| 11 | מי מטפל | `owner` |
| 12 | תאריך תור | `appointmentAt` |
| 13 | הערות | `notes` |
| 14 | עדכון אחרון | `updatedAt` |
| 15 | דחיפות | `urgency` |
| 16 | סיבות הסלמה | `escalationReasons` |
| 17 | ביטחון סיווג | `confidence` |
| 18 | מזהה בערוץ | `channelHandle` |
| 19 | מזהה הודעה אחרונה | `lastExternalId` |
| 20 | היסטוריה בעייתית | `problematicHistory` |
| 21 | מועד תזכורת תור | `appointmentReminderAt` |
| 22 | תזכורת תור נשלחה | `appointmentReminderSent` |
