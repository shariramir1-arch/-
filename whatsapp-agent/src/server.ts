import express from "express";
import { config, requireEnv } from "./config.js";
import { handleMessage } from "./agent.js";
import { startReminderLoop } from "./reminders.js";
import { Store } from "./store.js";
import { extractTextMessages, isValidSignature, sendText } from "./whatsapp.js";

requireEnv(["ANTHROPIC_API_KEY", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN"]);
if (!config.whatsapp.appSecret) {
  console.warn("WHATSAPP_APP_SECRET is not set - webhook signatures are NOT verified. Set it in production.");
}
if (!config.allowedNumbers.length) {
  console.warn("ALLOWED_NUMBERS is empty - nobody can use the bot until you add your number.");
}

const store = new Store(config.dataFile);
const app = express();

// Meta retries webhooks, so remember recent message ids to avoid acting twice
const seen = new Set<string>();
function firstTime(id: string): boolean {
  if (seen.has(id)) return false;
  seen.add(id);
  if (seen.size > 1000) seen.delete(seen.values().next().value!);
  return true;
}

// Process messages from the same sender one at a time, in order
const queues = new Map<string, Promise<void>>();
function enqueue(user: string, job: () => Promise<void>): void {
  const next = (queues.get(user) ?? Promise.resolve()).then(job).catch((err) => {
    console.error(`Error handling message from ${user}:`, err);
  });
  queues.set(user, next);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Webhook verification handshake (Meta calls this once when you save the webhook URL)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === config.whatsapp.verifyToken) {
    res.status(200).send(String(challenge));
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const raw = req.body as Buffer;
  if (!isValidSignature(raw, req.header("x-hub-signature-256"))) {
    res.sendStatus(401);
    return;
  }
  // Acknowledge immediately; Meta expects a fast 200
  res.sendStatus(200);

  let payload: unknown;
  try {
    payload = JSON.parse(raw.toString("utf8"));
  } catch {
    return;
  }

  for (const msg of extractTextMessages(payload)) {
    if (!firstTime(msg.id)) continue;
    if (!config.allowedNumbers.includes(msg.from)) {
      console.log(`Ignoring message from unauthorized number ${msg.from}`);
      continue;
    }
    enqueue(msg.from, async () => {
      console.log(`<- ${msg.from}: ${msg.text}`);
      let reply: string;
      try {
        reply = await handleMessage(store, msg.from, msg.text);
      } catch (err) {
        console.error(err);
        reply = "אירעה שגיאה בעיבוד ההודעה, נסה שוב בעוד רגע.";
      }
      console.log(`-> ${msg.from}: ${reply}`);
      await sendText(msg.from, reply);
    });
  }
});

startReminderLoop(store, sendText);

app.listen(config.port, () => {
  console.log(`WhatsApp agent listening on http://localhost:${config.port}`);
  console.log(`Webhook URL: https://<your-public-host>/webhook`);
});
