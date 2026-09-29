const crypto = require("crypto");

function resolveKey(value = process.env.RESUME_ENCRYPTION_KEY) {
  if (!value) {
    if (process.env.NODE_ENV === "production") throw new Error("RESUME_ENCRYPTION_KEY is required in production");
    return crypto.createHash("sha256").update("local-development-only").digest();
  }
  const key = /^[a-f0-9]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("RESUME_ENCRYPTION_KEY must decode to exactly 32 bytes");
  return key;
}

function encryptText(plaintext, keyValue) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", resolveKey(keyValue), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return JSON.stringify({
    v: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  });
}

function decryptText(payload, keyValue) {
  const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
  if (parsed.v !== 1) throw new Error("Unsupported encrypted payload version");
  const decipher = crypto.createDecipheriv("aes-256-gcm", resolveKey(keyValue), Buffer.from(parsed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(parsed.data, "base64")), decipher.final()]).toString("utf8");
}

module.exports = { encryptText, decryptText, resolveKey };
