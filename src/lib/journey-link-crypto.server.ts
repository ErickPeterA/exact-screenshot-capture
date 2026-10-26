import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function encryptionKey() {
  const encoded = process.env["JOURNEY_LINK_ENCRYPTION_KEY"];
  if (!encoded) throw new Error("Journey link encryption is not configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("JOURNEY_LINK_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

export function encryptJourneyToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptJourneyToken(value: string) {
  const [version, encodedIv, encodedTag, encodedCiphertext, extra] = value.split(".");
  if (version !== VERSION || !encodedIv || !encodedTag || !encodedCiphertext || extra) {
    throw new Error("Stored journey link is invalid.");
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
