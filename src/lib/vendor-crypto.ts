import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function getVendorDataKey() {
  const raw = process.env.VENDOR_DATA_KEY;
  if (!raw) {
    throw new Error("VENDOR_DATA_KEY is not set");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("VENDOR_DATA_KEY must be a 32-byte base64 key");
  }
  return key;
}

export function encryptAccountNumber(accountNumber: string) {
  const key = getVendorDataKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(accountNumber, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    cipher: `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`,
    last4: accountNumber.slice(-4),
  };
}

export function maskAccountNumber(last4: string | null | undefined) {
  if (!last4) return null;
  return `XXXXXX${last4}`;
}

/** Decrypt is server-only and must never be returned to the client. */
export function decryptAccountNumber(payload: string) {
  const key = getVendorDataKey();
  const [version, ivB64, tagB64, dataB64] = payload.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid cipher payload");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
