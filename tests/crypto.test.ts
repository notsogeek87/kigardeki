import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  // A fixed, valid 32-byte key for the test run only.
  process.env.ENCRYPTION_KEY = "6fh/oNujAEB5RYY9FYn3io/1Ood2/gfdKe1vPBQowkA=";
});

describe("crypto (field-level encryption)", () => {
  it("round-trips a plaintext value", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const ciphertext = encrypt("Charlie");
    expect(ciphertext).not.toBe("Charlie");
    expect(decrypt(ciphertext)).toBe("Charlie");
  });

  it("never reuses the same ciphertext for the same plaintext (random IV)", async () => {
    const { encrypt } = await import("@/lib/crypto");
    const a = encrypt("Mamie");
    const b = encrypt("Mamie");
    expect(a).not.toBe(b);
  });

  it("throws if the ciphertext has been tampered with", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const ciphertext = encrypt("secret");
    const tampered = ciphertext.slice(0, -4) + "abcd";
    expect(() => decrypt(tampered)).toThrow();
  });

  it("passes null/undefined through unchanged via the nullable helpers", async () => {
    const { encryptNullable, decryptNullable } = await import("@/lib/crypto");
    expect(encryptNullable(null)).toBeNull();
    expect(encryptNullable(undefined)).toBeNull();
    expect(decryptNullable(null)).toBeNull();
  });

  describe("hashToken (bearer-token lookup index)", () => {
    it("is deterministic — the same token always hashes the same way", async () => {
      const { hashToken } = await import("@/lib/crypto");
      expect(hashToken("my-token")).toBe(hashToken("my-token"));
    });

    it("never matches a different token's hash", async () => {
      const { hashToken } = await import("@/lib/crypto");
      expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
    });

    it("does not reveal the plaintext", async () => {
      const { hashToken } = await import("@/lib/crypto");
      expect(hashToken("my-token")).not.toContain("my-token");
    });
  });
});
