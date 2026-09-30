import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { Store } from "../src/store.js";

// A fake Messages API: the first request gets an add_task tool call, the next gets a text reply
const requests: any[] = [];
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const parsed = JSON.parse(body);
    requests.push(parsed);
    const base = { id: `msg_${requests.length}`, type: "message", role: "assistant", model: parsed.model,
      stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } };
    const lastUser = parsed.messages.at(-1);
    const wantsTool = typeof lastUser.content === "string" && lastUser.content.includes("תוסיף משימה");
    const out = wantsTool
      ? { ...base, stop_reason: "tool_use",
          content: [{ type: "tool_use", id: `tu_${requests.length}`, name: "add_task", input: { title: "לבדוק את הבוט" } }] }
      : { ...base, stop_reason: "end_turn", content: [{ type: "text", text: "הוספתי ✅" }] };
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(out));
  });
});

let agent: typeof import("../src/agent.js");

before(async () => {
  server.listen(0);
  await new Promise((r) => server.once("listening", r));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.ANTHROPIC_API_KEY = "test";
  agent = await import("../src/agent.js");
});

after(() => server.close());

test("actions that really ran are saved and shown to Claude on the next turn", async () => {
  const store = new Store(path.join(fs.mkdtempSync(path.join(os.tmpdir(), "wa-agent-")), "db.json"));

  assert.equal(await agent.handleMessage(store, "u", "תוסיף משימה: לבדוק את הבוט"), "הוספתי ✅");
  assert.equal(store.listTasks().length, 1);
  const turn = store.getHistory("u")[1];
  assert.equal(turn.actions?.length, 1);
  assert.match(turn.actions![0], /^add_task \{"title":"לבדוק את הבוט"\}/);

  await agent.handleMessage(store, "u", "מה המשימות שלי?");
  const replayed = requests.at(-1).messages[1].content as string;
  assert.match(replayed, /^\[tools run in this turn: add_task /);
  assert.ok(replayed.endsWith("הוספתי ✅"));
  // The second turn ran no tools, and says so
  assert.deepEqual(store.getHistory("u")[3].actions, []);
});

test("rendering and stripping the note", () => {
  assert.equal(agent.renderTurn({ role: "user", text: "hi" }), "hi");
  assert.equal(agent.renderTurn({ role: "assistant", text: "old" }), "old");
  assert.equal(agent.renderTurn({ role: "assistant", text: "x", actions: [] }), "[tools run in this turn: none]\nx");
  assert.equal(agent.stripNote("[tools run in this turn: save_note {\"tags\":[\"a\"]}]\nשלום"), "שלום");
  assert.equal(agent.stripNote("שלום"), "שלום");
});
