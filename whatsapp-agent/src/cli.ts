/**
 * Chat with the agent in the terminal, without WhatsApp.
 * Reminders are printed here instead of being sent.
 */
import readline from "node:readline/promises";
import { config, requireEnv } from "./config.js";
import { handleMessage } from "./agent.js";
import { startReminderLoop } from "./reminders.js";
import { Store } from "./store.js";

requireEnv(["ANTHROPIC_API_KEY"]);

const USER = "local-cli";
const store = new Store(config.dataFile);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const timer = startReminderLoop(store, async (_to, text) => {
  console.log(`\n${text}\n`);
}, 5_000);

console.log('Type a message (Ctrl+C or "exit" to quit)');
while (true) {
  const text = (await rl.question("> ")).trim();
  if (!text) continue;
  if (text === "exit") break;
  try {
    console.log(`\n${await handleMessage(store, USER, text)}\n`);
  } catch (err) {
    console.error(err);
  }
}

clearInterval(timer);
rl.close();
