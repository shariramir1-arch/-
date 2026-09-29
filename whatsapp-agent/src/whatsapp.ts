import crypto from "node:crypto";
import { config } from "./config.js";

export interface IncomingMessage {
  id: string;
  from: string;
  name?: string;
  /** WhatsApp message type: text, image, audio, interactive, ... */
  type: string;
  /** The text, or undefined for message types the bot can't read (voice, images, stickers...) */
  text?: string;
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

/** Marks an incoming message as read (blue ticks). */
export async function markRead(messageId: string): Promise<void> {
  const { apiVersion, phoneNumberId, token } = config.whatsapp;
  const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: messageId }),
  });
  if (!res.ok) {
    throw new Error(`WhatsApp markRead failed (${res.status}): ${await res.text()}`);
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

/** The readable text of a message: plain text, button/list replies, or a media caption. */
function textOf(msg: any): string | undefined {
  switch (msg?.type) {
    case "text":
      return msg.text?.body || undefined;
    case "interactive":
      return msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title;
    case "button":
      return msg.button?.text;
    case "image":
    case "video":
    case "document":
      return msg[msg.type]?.caption || undefined;
    default:
      return undefined;
  }
}

/**
 * Extracts user messages from a WhatsApp webhook payload; ignores delivery statuses.
 * Messages without readable text are returned with `text` undefined so the bot can say so.
 */
export function extractMessages(payload: any): IncomingMessage[] {
  const out: IncomingMessage[] = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      const contacts: any[] = value?.contacts ?? [];
      for (const msg of value?.messages ?? []) {
        if (!msg?.id || !msg?.from || msg.type === "reaction" || msg.type === "system") continue;
        out.push({
          id: msg.id,
          from: msg.from,
          name: contacts.find((c) => c.wa_id === msg.from)?.profile?.name,
          type: msg.type,
          text: textOf(msg),
        });
      }
    }
  }
  return out;
}
