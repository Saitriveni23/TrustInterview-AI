const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { encryptText, decryptText } = require("../services/encryption");

test("resume encryption round-trips without storing plaintext", () => {
  const key = crypto.randomBytes(32).toString("base64");
  const text = "private candidate resume text";
  const encrypted = encryptText(text, key);
  assert.equal(encrypted.includes(text), false);
  assert.equal(decryptText(encrypted, key), text);
});

test("tampering fails authenticated decryption", () => {
  const key = crypto.randomBytes(32).toString("base64");
  const payload = JSON.parse(encryptText("resume", key));
  payload.data = Buffer.from("tampered").toString("base64");
  assert.throws(() => decryptText(payload, key));
});
