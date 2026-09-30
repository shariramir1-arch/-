import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Store } from "../src/store.js";
import { sendDueReminders } from "../src/reminders.js";
import { config } from "../src/config.js";
import { extractMessages, isValidSignature } from "../src/whatsapp.js";

const tempFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "wa-agent-")), "db.json");

test("store persists tasks, leads and notes across instances", () => {
  const file = tempFile();
  const a = new Store(file);
  const task = a.addTask("להתקשר לדני");
  a.addLead({ name: "רונית", interest: "consulting" });
  a.addNote("רעיון לסדנה", ["סדנאות"]);

  const b = new Store(file);
  assert.equal(b.listTasks().length, 1);
  b.completeTask(task.id);
  assert.equal(b.listTasks().length, 0);
  assert.equal(b.listTasks(true).length, 1);
  assert.equal(b.listLeads("new")[0].name, "רונית");
  assert.equal(b.searchNotes("סדנאות").length, 1);
});

test("history is capped and always starts with a user turn", () => {
  const store = new Store(tempFile());
  for (let i = 0; i < 15; i++) {
    store.appendHistory("u", { role: "user", text: `q${i}` }, { role: "assistant", text: `a${i}` });
  }
  const history = store.getHistory("u");
  assert.ok(history.length <= 20);
  assert.equal(history[0].role, "user");
  assert.equal(history.at(-1)?.text, "a14");
});

test("due reminders are sent once; failures are retried", async () => {
  const store = new Store(tempFile());
  const past = new Date(Date.now() - 1000).toISOString();
  const future = new Date(Date.now() + 3_600_000).toISOString();
  store.addReminder("972500000000", "פגישה", past);
  store.addReminder("972500000000", "later", future);

  let fail = true;
  const sent: string[] = [];
  const send = async (_to: string, text: string) => {
    if (fail) throw new Error("network");
    sent.push(text);
  };

  assert.equal(await sendDueReminders(store, send), 0);
  fail = false;
  assert.equal(await sendDueReminders(store, send), 1);
  assert.equal(await sendDueReminders(store, send), 0);
  assert.deepEqual(sent, ["⏰ תזכורת: פגישה"]);
  assert.equal(store.listReminders().length, 1);
});

test("extracts messages from a webhook payload", () => {
  const payload = {
    entry: [{
      changes: [{
        value: {
          contacts: [{ wa_id: "972501111111", profile: { name: "Shariram" } }],
          messages: [
            { id: "m1", from: "972501111111", type: "text", text: { body: "שלום" } },
            { id: "m2", from: "972501111111", type: "audio", audio: {} },
            { id: "m3", from: "972501111111", type: "interactive", interactive: { button_reply: { title: "כן" } } },
            { id: "m4", from: "972501111111", type: "reaction", reaction: { emoji: "👍" } },
          ],
          statuses: [{ id: "s1" }],
        },
      }],
    }],
  };
  assert.deepEqual(extractMessages(payload), [
    { id: "m1", from: "972501111111", name: "Shariram", type: "text", text: "שלום" },
    { id: "m2", from: "972501111111", name: "Shariram", type: "audio", text: undefined },
    { id: "m3", from: "972501111111", name: "Shariram", type: "interactive", text: "כן" },
  ]);
  assert.deepEqual(extractMessages({}), []);
});

test("webhook signature verification", () => {
  config.whatsapp.appSecret = "secret";
  const body = Buffer.from('{"a":1}');
  const sig = "sha256=" + crypto.createHmac("sha256", "secret").update(body).digest("hex");
  assert.ok(isValidSignature(body, sig));
  assert.ok(!isValidSignature(body, "sha256=" + "0".repeat(64)));
  assert.ok(!isValidSignature(body, undefined));
});

test("tasks can be deleted", () => {
  const store = new Store(tempFile());
  const a = store.addTask("לבדוק את הבוט");
  store.addTask("לבדוק את הבוט");
  assert.equal(store.deleteTask(a.id)?.id, a.id);
  assert.equal(store.deleteTask(a.id), undefined);
  assert.equal(store.listTasks(true).length, 1);
});

test("reminder history shows sent and cancelled reminders", async () => {
  const store = new Store(tempFile());
  const past = new Date(Date.now() - 1000).toISOString();
  const future = new Date(Date.now() + 3_600_000).toISOString();
  const water = store.addReminder("u", "לשתות מים", past);
  const later = store.addReminder("u", "פגישה", future);
  store.addReminder("other", "לא שלי", past);

  await sendDueReminders(store, async () => {});
  assert.ok(store.cancelReminder(later.id));
  assert.ok(!store.cancelReminder(later.id));
  assert.ok(!store.cancelReminder(water.id)); // already sent

  assert.equal(store.listReminders("u").length, 0);
  const history = store.reminderHistory("u");
  assert.deepEqual(history.map((r) => r.text).sort(), ["לשתות מים", "פגישה"]);
  assert.ok(history.find((r) => r.id === water.id)?.sentAt);
  assert.ok(history.find((r) => r.id === later.id)?.cancelledAt);

  // A cancelled reminder is never sent, even once its time has passed
  assert.equal(store.dueReminders(new Date(Date.now() + 7_200_000)).length, 0);
});
