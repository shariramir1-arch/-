import "dotenv/config";

function optional(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export const config = {
  port: Number(optional("PORT", "3000")),
  timezone: optional("TIMEZONE", "Asia/Jerusalem"),
  dataFile: optional("DATA_FILE", "./data/db.json"),
  model: optional("CLAUDE_MODEL", "claude-opus-5-5"),

  whatsapp: {
    token: optional("WHATSAPP_TOKEN"),
    phoneNumberId: optional("WHATSAPP_PHONE_NUMBER_ID"),
    verifyToken: optional("WHATSAPP_VERIFY_TOKEN"),
    appSecret: optional("WHATSAPP_APP_SECRET"),
    apiVersion: optional("WHATSAPP_API_VERSION", "v23.0"),
  },

  // Digits only, e.g. 972501234567
  allowedNumbers: optional("ALLOWED_NUMBERS")
    .split(",")
    .map((n) => n.replace(/\D/g, ""))
    .filter(Boolean),
};

/** Throws with a readable list of missing variables. */
export function requireEnv(names: string[]): void {
  const missing = names.filter((n) => !process.env[n]?.trim());
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")} (see .env.example)`);
  }
}
