import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { config } from "../src/config.js";
import { createApp } from "../src/app.js";
import { Store } from "../src/store.js";

const SECRET = "test-secret";
const OWNER = "972501111111";

const sent: { to: string; text: string }[] = [];
const handled: string[] = [];
let server: Server;
let base: string;
let idle: () => Promise<void>;

before(async () => {
  config.whatsapp.appSecret = SECRET;
  config.whatsapp.verifyToken = "verify-me";
  config.allowedNumbers = [OWNER];

  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "wa-app-")), "db.json");
  const built = createApp({
    store: new Store(file),
    handle: async (_store, _user, text) => {
      handled.push(text);
      if (text === "boom") throw new Error("model down");
      return `קיבלתי: ${text}`;
    },
    send: async (to, text) => {
      sent.push({ to, text });
    },
  });
  idle = built.idle;
  server = built.app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

function payload(from: string, id: string, msg: object) {
  return JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ id, from, ...msg }] } }] }] });
}

async function post(body: string, signature = "sha256=" + crypto.createHmac("sha256", SECRET).update(body).digest("hex")) {
  const res = await fetch(`${base}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Hub-Signature-256": signature },
    body,
  });
  await idle();
  return res.status;
}

test("health check", async () => {
  const res = await fetch(`${base}/health`);
  assert.deepEqual(await res.json(), { ok: true });
});

test("webhook verification handshake", async () => {
  const ok = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=123`);
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), "123");
  const bad = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123`);
  assert.equal(bad.status, 403);
});

test("text message from the owner is handled and answered once", async () => {
  sent.length = 0;
  const body = payload(OWNER, "wamid.1", { type: "text", text: { body: "תזכיר לי מחר" } });
  assert.equal(await post(body), 200);
  assert.equal(await post(body), 200); // Meta retry - must not be handled twice
  assert.deepEqual(sent, [{ to: OWNER, text: "קיבלתי: תזכיר לי מחר" }]);
});

test("bad signature is rejected", async () => {
  sent.length = 0;
  const body = payload(OWNER, "wamid.2", { type: "text", text: { body: "hi" } });
  assert.equal(await post(body, "sha256=" + "0".repeat(64)), 401);
  assert.equal(sent.length, 0);
});

test("messages from other numbers are ignored", async () => {
  sent.length = 0;
  assert.equal(await post(payload("972509999999", "wamid.3", { type: "text", text: { body: "hi" } })), 200);
  assert.equal(sent.length, 0);
});

test("voice messages get a polite text-only reply", async () => {
  sent.length = 0;
  handled.length = 0;
  await post(payload(OWNER, "wamid.4", { type: "audio", audio: { id: "x" } }));
  assert.equal(handled.length, 0);
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /טקסט/);
});

test("an agent error still sends a reply", async () => {
  sent.length = 0;
  await post(payload(OWNER, "wamid.5", { type: "text", text: { body: "boom" } }));
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /שגיאה/);
});
