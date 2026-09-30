import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeNumbers, parseEnv, renderEnv } from "../src/setup.js";

test("phone numbers are converted to international format", () => {
  assert.equal(normalizeNumbers("050-1234567"), "972501234567");
  assert.equal(normalizeNumbers("+972 52 111 2222, 0541112222"), "972521112222,972541112222");
  assert.throws(() => normalizeNumbers(""));
  assert.throws(() => normalizeNumbers("123"));
});

test("values are written into the template, keeping comments", () => {
  const template = "# Claude\nANTHROPIC_API_KEY=sk-ant-...\n# CLAUDE_MODEL=x\nPORT=3000";
  const out = renderEnv(template, { ANTHROPIC_API_KEY: "sk-ant-real", EXTRA: "1" });
  assert.equal(out, "# Claude\nANTHROPIC_API_KEY=sk-ant-real\n# CLAUDE_MODEL=x\nPORT=3000\nEXTRA=1");
  assert.deepEqual(parseEnv(out), { ANTHROPIC_API_KEY: "sk-ant-real", PORT: "3000", EXTRA: "1" });
});
