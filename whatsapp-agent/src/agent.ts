import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import type { ChatTurn, Store } from "./store.js";
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
- Don't invent ids; look them up with the list tools first.
- Only say that something was saved, scheduled or updated if you called the tool for it in this turn
  and it succeeded. Never describe an action you did not perform.
- Earlier assistant turns start with a note in square brackets listing the tools that were actually run
  in that turn. The system adds these notes; never write one yourself.`;

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

const NOTE_PREFIX = "[tools run in this turn:";

/** How a past turn is shown to Claude; assistant turns carry a note of the tools that really ran. */
export function renderTurn(turn: ChatTurn): string {
  // Turns saved before actions were recorded have no note
  if (turn.role !== "assistant" || turn.actions === undefined) return turn.text;
  const actions = turn.actions.length ? turn.actions.join("; ") : "none";
  return `${NOTE_PREFIX} ${actions}]\n${turn.text}`;
}

/** Removes a note the model may have copied into its own reply. */
export function stripNote(reply: string): string {
  return reply.startsWith(NOTE_PREFIX) ? reply.split("\n").slice(1).join("\n").trim() : reply;
}

/** Handles one incoming message and returns the text to send back. */
export async function handleMessage(store: Store, user: string, text: string): Promise<string> {
  const history = store.getHistory(user);
  const userContent = `[${currentTime()}]\n${text}`;

  // Record every tool that actually runs, so later turns know what was really done
  const actions: string[] = [];
  const tools = buildTools(store, user).map((tool) => ({
    ...tool,
    run: async (input: any, context?: any) => {
      const result = await tool.run(input, context);
      const summary = typeof result === "string" && result.length > 200 ? `${result.slice(0, 200)}...` : result;
      actions.push(`${tool.name} ${JSON.stringify(input)} -> ${typeof summary === "string" ? summary : "ok"}`);
      return result;
    },
  }));

  const finalMessage = await client.beta.messages.toolRunner({
    model: config.model,
    max_tokens: 16000,
    // If a request is declined by a safety classifier, retry it on a fallback model automatically
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    tools,
    messages: [
      ...history.map((t) => ({ role: t.role, content: renderTurn(t) })),
      { role: "user", content: userContent },
    ],
    max_iterations: 10,
  });

  let reply = stripNote(
    finalMessage.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim(),
  );

  if (finalMessage.stop_reason === "refusal") {
    reply = "מצטער, אני לא יכול לעזור בבקשה הזו.";
  } else if (!reply) {
    reply = "בוצע ✅";
  }

  store.appendHistory(user, { role: "user", text: userContent }, { role: "assistant", text: reply, actions });
  return reply;
}
