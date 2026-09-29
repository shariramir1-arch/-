import express from "express";
import { config } from "./config.js";
import type { Store } from "./store.js";
import { extractMessages, isValidSignature } from "./whatsapp.js";

export interface AppDeps {
  store: Store;
  /** Turns an incoming text into the reply to send back */
  handle: (store: Store, user: string, text: string) => Promise<string>;
  send: (to: string, text: string) => Promise<void>;
  /** Best-effort read receipt; optional */
  markRead?: (messageId: string) => Promise<void>;
}

const UNSUPPORTED_REPLY = "כרגע אני מבין רק הודעות טקסט 🙂 אפשר לכתוב לי את הבקשה במילים?";
const ERROR_REPLY = "אירעה שגיאה בעיבוד ההודעה, נסה שוב בעוד רגע.";

/** Builds the HTTP app: health check, Meta webhook handshake and incoming messages. */
export function createApp({ store, handle, send, markRead }: AppDeps) {
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
  function enqueue(user: string, job: () => Promise<void>): Promise<void> {
    const next = (queues.get(user) ?? Promise.resolve()).then(job).catch((err) => {
      console.error(`Error handling message from ${user}:`, err);
    });
    queues.set(user, next);
    void next.then(() => {
      if (queues.get(user) === next) queues.delete(user);
    });
    return next;
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
      res.status(200).type("text/plain").send(String(challenge));
    } else {
      res.sendStatus(403);
    }
  });

  app.post("/webhook", express.raw({ type: "*/*", limit: "1mb" }), (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
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

    for (const msg of extractMessages(payload)) {
      if (!firstTime(msg.id)) continue;
      if (!config.allowedNumbers.includes(msg.from)) {
        console.log(`Ignoring message from unauthorized number ${msg.from}`);
        continue;
      }
      markRead?.(msg.id).catch((err) => console.warn("markRead failed:", err.message ?? err));

      enqueue(msg.from, async () => {
        let reply: string;
        if (msg.text === undefined) {
          console.log(`<- ${msg.from}: [${msg.type}]`);
          reply = UNSUPPORTED_REPLY;
        } else {
          console.log(`<- ${msg.from}: ${msg.text}`);
          try {
            reply = await handle(store, msg.from, msg.text);
          } catch (err) {
            console.error(err);
            reply = ERROR_REPLY;
          }
        }
        console.log(`-> ${msg.from}: ${reply}`);
        await send(msg.from, reply);
      });
    }
  });

  /** Resolves once every queued message has been handled (used by tests and shutdown). */
  const idle = () => Promise.all([...queues.values()]).then(() => undefined);

  return { app, idle };
}
