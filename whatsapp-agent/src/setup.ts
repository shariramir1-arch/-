/**
 * Interactive helper that creates (or updates) the .env file.
 * Run with: npm run setup
 */
import fs from "node:fs";
import readline from "node:readline";

interface Question {
  key: string;
  prompt: string;
  /** Turns the typed answer into the stored value; throws with a message if it is invalid */
  clean?: (answer: string) => string;
  optional?: boolean;
}

/** "050-1234567, +972 52 111 2222" -> "972501234567,972521112222" */
export function normalizeNumbers(input: string): string {
  const numbers = input
    .split(",")
    .map((n) => n.replace(/\D/g, ""))
    .filter(Boolean)
    .map((n) => (n.startsWith("0") ? `972${n.slice(1)}` : n));
  if (!numbers.length) throw new Error("צריך לפחות מספר אחד");
  for (const n of numbers) {
    if (n.length < 10 || n.length > 15) throw new Error(`המספר ${n} לא נראה תקין`);
  }
  return numbers.join(",");
}

/** Fills the values into the template, keeping its comments and order; unknown keys are appended. */
export function renderEnv(template: string, values: Record<string, string>): string {
  const done = new Set<string>();
  const lines = template.split("\n").map((line) => {
    const match = line.match(/^#?\s*([A-Z0-9_]+)=/);
    if (!match || !(match[1] in values)) return line;
    done.add(match[1]);
    return `${match[1]}=${values[match[1]]}`;
  });
  const extra = Object.keys(values).filter((k) => !done.has(k));
  return [...lines, ...extra.map((k) => `${k}=${values[k]}`)].join("\n");
}

/** Reads KEY=value pairs from an existing .env */
export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}

const QUESTIONS: Question[] = [
  {
    key: "ANTHROPIC_API_KEY",
    prompt: "מפתח Claude (מ-console.anthropic.com → API Keys, מתחיל ב-sk-ant-)",
    clean: (a) => {
      if (!a.startsWith("sk-ant-")) throw new Error("המפתח אמור להתחיל ב-sk-ant-");
      return a;
    },
  },
  { key: "WHATSAPP_PHONE_NUMBER_ID", prompt: "Phone number ID (Meta → WhatsApp → API Setup)", optional: true,
    clean: (a) => {
      if (!/^\d+$/.test(a)) throw new Error("זה אמור להיות מספר מזהה, ספרות בלבד");
      return a;
    } },
  { key: "WHATSAPP_TOKEN", prompt: "WhatsApp access token (Meta → WhatsApp → API Setup)", optional: true },
  { key: "WHATSAPP_APP_SECRET", prompt: "App secret (Meta → App settings → Basic)", optional: true },
  {
    key: "WHATSAPP_VERIFY_TOKEN",
    prompt: "סיסמה לאימות ה-Webhook (המצאה שלך; Enter = ליצור אוטומטית)",
    optional: true,
  },
  {
    key: "ALLOWED_NUMBERS",
    prompt: "מספרי הוואטסאפ שמורשים לדבר עם הבוט (למשל 050-1234567, כמה מספרים עם פסיק)",
    clean: normalizeNumbers,
  },
];

async function main() {
  const envFile = ".env";
  const template = fs.readFileSync(".env.example", "utf8");
  const existing = fs.existsSync(envFile) ? parseEnv(fs.readFileSync(envFile, "utf8")) : {};
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (prompt: string): Promise<string> => {
    process.stdout.write(`${prompt}\n> `);
    const next = await lines.next();
    if (next.done) throw new Error("הקלט נסגר לפני שהסתיימו השאלות");
    return next.value;
  };

  console.log("\nיצירת קובץ .env לבוט הוואטסאפ");
  console.log("שדות שעדיין אין לך אפשר לדלג עליהם עם Enter ולהריץ את הפקודה שוב אחר כך.\n");

  const values: Record<string, string> = { ...existing };
  for (const q of QUESTIONS) {
    const current = existing[q.key] && !existing[q.key].includes("...") && !existing[q.key].includes("XXXX")
      ? existing[q.key]
      : "";
    const hint = current ? ` [Enter = להשאיר את הערך הקיים]` : "";
    while (true) {
      const answer = (await ask(`${q.prompt}${hint}:`)).trim();
      if (!answer) {
        if (current) values[q.key] = current;
        else if (q.key === "WHATSAPP_VERIFY_TOKEN") values[q.key] = `verify-${Math.random().toString(36).slice(2, 12)}`;
        else values[q.key] = "";
        break;
      }
      try {
        values[q.key] = q.clean ? q.clean(answer) : answer;
        break;
      } catch (err) {
        console.log(`⚠️  ${(err as Error).message}, נסה שוב (או Enter לדלג)`);
      }
    }
    console.log();
  }
  rl.close();

  fs.writeFileSync(envFile, renderEnv(template, values));
  console.log(`✅ הקובץ ${envFile} נשמר.`);
  console.log(`   סיסמת ה-Webhook שלך (להזין ב-Meta): ${values.WHATSAPP_VERIFY_TOKEN}`);
  const missing = QUESTIONS.filter((q) => !values[q.key]).map((q) => q.key);
  if (missing.length) console.log(`   עדיין חסרים: ${missing.join(", ")}`);
  console.log(values.ANTHROPIC_API_KEY ? "\nלבדיקה: npm run chat" : "");
}

// Only run the wizard when executed directly (not when imported by tests)
if (process.argv[1]?.endsWith("setup.ts")) {
  await main();
}
