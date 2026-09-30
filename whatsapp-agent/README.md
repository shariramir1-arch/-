# WhatsApp Agent – עוזר אישי בוואטסאפ

שולחים הודעה רגילה בוואטסאפ (בעברית), והמערכת מבינה מה צריך ומבצעת את הפעולה בעצמה.
ה"מוח" הוא Claude, והחיבור לוואטסאפ עובר דרך WhatsApp Cloud API הרשמי של Meta.

## מה אפשר לבקש

| דוגמה להודעה | מה קורה |
|---|---|
| "תזכיר לי מחר ב-9 להתקשר לדני" | נקבעת תזכורת, ובזמן שנקבע נשלחת אליך הודעת וואטסאפ |
| "תוסיף משימה: להכין הצעת מחיר לרונית" | המשימה נשמרת ברשימת המשימות |
| "מה המשימות הפתוחות שלי?" / "סיימתי את ההצעה לרונית" | מוצגת רשימת המשימות / המשימה מסומנת כבוצעה |
| "ליד חדש: יוסי כהן, 050-1234567, מתעניין בהרצאה על AI" | הליד נשמר במאגר הלידים |
| "תעדכן שיוסי בשלב הצעת מחיר" / "אילו לידים חדשים יש?" | סטטוס הליד מתעדכן / מוצגת רשימת הלידים |
| "תרשום רעיון: סדנת אוטומציה לעסקים קטנים" / "מה רשמתי על סדנאות?" | הרעיון נשמר כפתק / מתבצע חיפוש בפתקים |
| "תכתוב לי פוסט קצר לפייסבוק על סוכני AI" | התוכן נכתב ומוחזר ישירות בצ'אט |
| "תתחיל שיחה חדשה" | היסטוריית השיחה נמחקת (הנתונים עצמם נשמרים) |

הודעות קוליות, תמונות ומדבקות מקבלות תשובה שהבוט מבין כרגע רק טקסט. כיתוב של תמונה ולחיצה על כפתורים כן נקראים.

רק המספרים שמופיעים ב-`ALLOWED_NUMBERS` יכולים לתת לבוט פקודות. הודעות מכל מספר אחר לא מטופלות.

## איך זה בנוי

```
וואטסאפ ──► Meta Cloud API ──► POST /webhook (app.ts, מופעל מ-server.ts)
                                   │  אימות חתימה, סינון מספרים, מניעת כפילויות
                                   ▼
                              agent.ts ── Claude + כלים (tools.ts)
                                   │            │
                                   │            ▼
                                   │       store.ts  (data/db.json)
                                   ▼
                              sendText() ──► תשובה בוואטסאפ

reminders.ts – בודק כל 30 שניות אם הגיע זמנה של תזכורת, ואם כן שולח אותה
```

## התקנה

דרישות: Node.js 20 ומעלה.

```bash
cd whatsapp-agent
npm install
npm run setup          # שואל על כל ערך ויוצר את קובץ .env
```

אפשר להריץ את `npm run setup` שוב בכל שלב כדי להשלים ערכים חסרים. ערכים שכבר מולאו נשמרים.
מי שמעדיף ידנית: `cp .env.example .env` ולמלא בעורך טקסט.

### בדיקה מקומית, בלי וואטסאפ

מספיק למלא `ANTHROPIC_API_KEY` בקובץ `.env`:

```bash
npm run chat
```

נפתח צ'אט בטרמינל שעובד בדיוק כמו הבוט, ותזכורות מודפסות בו כשמגיע הזמן שלהן.

### חיבור לוואטסאפ (WhatsApp Cloud API)

1. נכנסים ל-[developers.facebook.com](https://developers.facebook.com) ויוצרים אפליקציה מסוג **Business**, ואז מוסיפים לה את המוצר **WhatsApp**.
2. במסך **WhatsApp → API Setup** מעתיקים את ה-**Phone number ID** אל `WHATSAPP_PHONE_NUMBER_ID`.
   אפשר להתחיל עם מספר הבדיקה ש-Meta נותנת, ולהוסיף את המספר האישי שלך כנמען מורשה.
3. יוצרים טוקן קבוע: **Business Settings → System Users**, מוסיפים System User עם ההרשאות
   `whatsapp_business_messaging` ו-`whatsapp_business_management`, ומעתיקים את הטוקן אל `WHATSAPP_TOKEN`.
4. ב-**App settings → Basic** מעתיקים את **App secret** אל `WHATSAPP_APP_SECRET`.
5. בוחרים מחרוזת אקראית כלשהי ורושמים אותה ב-`WHATSAPP_VERIFY_TOKEN`.
6. ב-`ALLOWED_NUMBERS` רושמים את המספר שלך בפורמט בינלאומי, ספרות בלבד (למשל `972501234567`).
7. מריצים את השרת (`npm start`) וחושפים אותו לאינטרנט בכתובת HTTPS.
   לבדיקות אפשר להשתמש ב-`ngrok http 3000` או ב-`cloudflared tunnel`. לשימוש קבוע אפשר לפרוס ל-Render, Railway, Fly.io או לשרת VPS.
8. ב-**WhatsApp → Configuration → Webhook** מזינים את הכתובת `https://<הכתובת-שלך>/webhook` ואת ה-Verify token מסעיף 5,
   ואז לוחצים **Subscribe** על השדה `messages`.
9. שולחים הודעה למספר של הבוט, והוא אמור לענות.

> **שימו לב:** לפי הכללים של וואטסאפ, בוט יכול לשלוח הודעה חופשית רק בתוך 24 שעות מההודעה האחרונה ששלחת לו.
> תזכורת שמתוזמנת ליותר מ-24 שעות אחרי ההודעה האחרונה שלך לא תגיע. כדי לעקוף את זה צריך
> [Message Template](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates) מאושר.

## פריסה קבועה (Production)

הבוט צריך לרוץ כל הזמן בכתובת HTTPS ציבורית, ואסור שקובץ הנתונים יימחק בין פריסות.

**Render (הכי פשוט):** ב-Render בוחרים **New → Blueprint** ומצביעים על הריפו. הקובץ `render.yaml` מגדיר שירות Docker
עם דיסק קבוע ב-`/data` ובדיקת תקינות. אחרי הפריסה הראשונה ממלאים בדשבורד את המשתנים הסודיים,
ומזינים ב-Meta את הכתובת `https://<שם-השירות>.onrender.com/webhook`.

**Docker בכל שרת:**

```bash
docker build -t whatsapp-agent .
docker run -d --name whatsapp-agent --restart unless-stopped \
  --env-file .env -p 3000:3000 -v whatsapp-data:/data whatsapp-agent
```

מול הקונטיינר צריך לשים reverse proxy עם HTTPS, למשל Caddy או nginx, או Cloudflare Tunnel.

בעצירה (SIGTERM) השרת מסיים לטפל בהודעות שכבר התקבלו ורק אז יוצא, כך שפריסה מחדש לא מאבדת הודעות.

## פקודות

| פקודה | מה היא עושה |
|---|---|
| `npm start` | מריצה את השרת |
| `npm run dev` | מריצה את השרת ומפעילה אותו מחדש בכל שינוי בקוד |
| `npm run setup` | יוצרת או מעדכנת את קובץ `.env` בעזרת שאלות |
| `npm run chat` | פותחת צ'אט בטרמינל, בלי וואטסאפ |
| `npm test` | מריצה את הבדיקות |
| `npm run typecheck` | בודקת את הטיפוסים של TypeScript |

## הוספת פעולה חדשה

כל פעולה מוגדרת ככלי ב-`src/tools.ts`: שם, תיאור, סכמת קלט (Zod) ופונקציית `run`.
Claude מחליט בעצמו מתי להפעיל כל כלי לפי התיאור שלו. לדוגמה, כלי ששולח מייל:

```ts
betaZodTool({
  name: "send_email",
  description: "Send an email on the user's behalf.",
  inputSchema: z.object({ to: z.string(), subject: z.string(), body: z.string() }),
  run: async ({ to, subject, body }) => { /* קריאה לשירות המייל */ return "sent"; },
}),
```

רעיונות להמשך: חיבור ליומן Google, סנכרון לידים לטופס באתר או ל-Google Sheets, תמלול הודעות קוליות, ותקציר בוקר יומי.
