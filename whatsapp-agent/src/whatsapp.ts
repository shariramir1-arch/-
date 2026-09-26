import crypto from "node:crypto";
import { config } from "./config.js";

export interface IncomingText {
  id: string;
  from: string;
  name?: string;
  text: string;
}

/** Sends a plain text message through the WhatsApp Cloud API. */
export async function sendText(to: string, body: string): Promise<void> {
  const { apiVersion, phoneNumberId, token } = config.whatsapp;
  const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      // WhatsApp caps text bodies at 4096 characters
      text: { body: body.slice(0, 4096), preview_url: false },
    }),
  });
  if (!res.ok) {
    throw new Error(`WhatsApp send failed (${res.status}): ${await res.text()}`);
  }
}

/** Verifies the X-Hub-Signature-256 header Meta attaches to every webhook POST. */
export function isValidSignature(rawBody: Buffer, header: string | undefined): boolean {
  if (!config.whatsapp.appSecret) return true; // verification disabled (local testing only)
  if (!header?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", config.whatsapp.appSecret).update(rawBody).digest("hex");
  const given = header.slice("sha256=".length);
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** Extracts text messages from a WhatsApp webhook payload; ignores statuses and other types. */
export function extractTextMessages(payload: any): IncomingText[] {
  const out: IncomingText[] = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      const contacts: any[] = value?.contacts ?? [];
      for (const msg of value?.messages ?? []) {
        if (msg?.type !== "text" || !msg.text?.body) continue;
        out.push({
          id: msg.id,
          from: msg.from,
          name: contacts.find((c) => c.wa_id === msg.from)?.profile?.name,
          text: msg.text.body,
        });
      }
    }
  }
  return out;
}
