import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * Returns a 32-byte encryption key.
 * Priority:
 *   1. ENCRYPTION_KEY env var (64 hex chars → 32 bytes)
 *   2. Derived from DATABASE_URL via scrypt (deterministic, safe for dev)
 */
function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (hex && hex.length >= 64) return Buffer.from(hex.slice(0, 64), "hex");
  // Deterministic fallback — same output for the same DATABASE_URL
  const seed = process.env.DATABASE_URL ?? "ai-wallet-dev-seed-not-for-production";
  return scryptSync(seed, "ai-wallet-salt-v1", 32) as Buffer;
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a colon-separated string: base64(iv):base64(authTag):base64(ciphertext)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag(); // 128-bit auth tag
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

/**
 * Decrypts a value produced by encrypt().
 * Throws if the data is tampered (auth tag mismatch) or malformed.
 */
export function decrypt(stored: string): string {
  const parts = stored.split(":");
  if (parts.length !== 3) throw new Error("Encrypted key has unexpected format");
  const [ivB64, tagB64, ciphertextB64] = parts;
  const key = getKey();
  const iv         = Buffer.from(ivB64,         "base64");
  const tag        = Buffer.from(tagB64,        "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
