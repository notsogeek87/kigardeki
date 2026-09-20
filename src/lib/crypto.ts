import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Application-level encryption for personal data (child/caregiver names,
 * notes, phone numbers, locations, birth dates...) using AES-256-GCM.
 *
 * This is on top of, not instead of, transport encryption (TLS to the
 * database) and the database provider's own encryption at rest. It protects
 * the content of these specific fields even if the raw database were ever
 * exposed (a leaked backup, a misconfigured access grant, etc).
 *
 * Fields that drive SQL filtering/sorting (event start/end times, ids,
 * emails used for login, roles) are intentionally NOT encrypted here:
 * encrypting them would either break range queries (non-deterministic
 * encryption) or leak ordering (deterministic encryption), and the calendar
 * cannot function without querying by date.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded).");
  }
  return key;
}

/** Encrypts a UTF-8 string. Returns a base64 payload: iv || authTag || ciphertext. */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/** Reverses {@link encrypt}. */
export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = buf.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function encryptNullable(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined) return null;
  return encrypt(plaintext);
}

export function decryptNullable(payload: string | null | undefined): string | null {
  if (payload === null || payload === undefined) return null;
  return decrypt(payload);
}
