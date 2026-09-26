import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import type { Store } from "./store.js";
import { buildTools } from "./tools.js";

const SYSTEM_PROMPT = `You are a personal assistant that the user talks to over WhatsApp.
You help run a small business: managing tasks, reminders, leads (potential customers) and notes,
and writing short texts such as marketing posts or replies to customers.

- Reply in the language the user writes in (usually Hebrew).
- Keep replies short and suited to WhatsApp: plain text, no markdown headings or tables.
  Use *bold* sparingly and simple line breaks or "-" lists.
- When the user asks for something one of your tools can do, do it, then confirm briefly what was done
  (for example the time a reminder is set for).
- Each message starts with the current date and time in brackets; use it to resolve relative times
  like "tomorrow" or "in an hour". Always pass times to tools as ISO 8601 with the timezone offset.
- If a request is ambiguous in a way that matters (for example no time was given for a reminder), ask one short question.
- Don't invent ids; look them up with the list tools first.`;

const client = new Anthropic();

/** e.g. "Thursday, September 24, 2026 at 17:05 GMT+03:00 (Asia/Jerusalem)" */
export function currentTime(date = new Date()): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).format(date);
  return `${formatted} (${config.timezone})`;
}

/** Handles one incoming message and returns the text to send back. */
export async function handleMessage(store: Store, user: string, text: string): Promise<string> {
  const history = store.getHistory(user);
  const userContent = `[${currentTime()}]\n${text}`;

  const finalMessage = await client.beta.messages.toolRunner({
    model: config.model,
    max_tokens: 16000,
    // If a request is declined by a safety classifier, retry it on a fallback model automatically
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    tools: buildTools(store, user),
    messages: [
      ...history.map((t) => ({ role: t.role, content: t.text })),
      { role: "user", content: userContent },
    ],
    max_iterations: 10,
  });

  let reply = finalMessage.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (finalMessage.stop_reason === "refusal") {
    reply = "מצטער, אני לא יכול לעזור בבקשה הזו.";
  } else if (!reply) {
    reply = "בוצע ✅";
  }

  store.appendHistory(user, { role: "user", text: userContent }, { role: "assistant", text: reply });
  return reply;
}
