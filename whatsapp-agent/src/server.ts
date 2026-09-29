import { config, requireEnv } from "./config.js";
import { handleMessage } from "./agent.js";
import { createApp } from "./app.js";
import { startReminderLoop } from "./reminders.js";
import { Store } from "./store.js";
import { markRead, sendText } from "./whatsapp.js";

requireEnv(["ANTHROPIC_API_KEY", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN"]);
if (!config.whatsapp.appSecret) {
  console.warn("WHATSAPP_APP_SECRET is not set - webhook signatures are NOT verified. Set it in production.");
}
if (!config.allowedNumbers.length) {
  console.warn("ALLOWED_NUMBERS is empty - nobody can use the bot until you add your number.");
}

const store = new Store(config.dataFile);
const { app, idle } = createApp({ store, handle: handleMessage, send: sendText, markRead });
const timer = startReminderLoop(store, sendText);

const server = app.listen(config.port, () => {
  console.log(`WhatsApp agent listening on http://localhost:${config.port} (model: ${config.model})`);
  console.log(`Webhook URL: https://<your-public-host>/webhook`);
});

// Finish in-flight messages before exiting (e.g. on redeploy)
function shutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);
  clearInterval(timer);
  server.close();
  const force = setTimeout(() => process.exit(0), 20_000);
  force.unref();
  idle().finally(() => process.exit(0));
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
