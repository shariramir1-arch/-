import type { Store } from "./store.js";

type Send = (to: string, text: string) => Promise<void>;

/** Sends every due reminder once. Returns how many were sent. */
export async function sendDueReminders(store: Store, send: Send, now = new Date()): Promise<number> {
  let sent = 0;
  for (const reminder of store.dueReminders(now)) {
    try {
      await send(reminder.to, `⏰ תזכורת: ${reminder.text}`);
      store.markReminderSent(reminder.id);
      sent++;
    } catch (err) {
      // Left unsent so the next tick retries it
      console.error(`Failed to send reminder ${reminder.id}:`, err);
    }
  }
  return sent;
}

/** Checks for due reminders every `intervalMs`. */
export function startReminderLoop(store: Store, send: Send, intervalMs = 30_000): NodeJS.Timeout {
  let running = false;
  return setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await sendDueReminders(store, send);
    } finally {
      running = false;
    }
  }, intervalMs);
}
