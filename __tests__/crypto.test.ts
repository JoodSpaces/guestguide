import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto";

describe("AES-256-GCM encrypt/decrypt", () => {
  it("round-trips short plaintext", () => {
    const plain = "wifi-password-123";
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  it("round-trips empty string", () => {
    expect(decrypt(encrypt(""))).toBe("");
  });

  it("round-trips unicode", () => {
    const plain = "كلمة المرور 🔑";
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  it("produces different ciphertexts for same input (random IV)", () => {
    const c1 = encrypt("secret");
    const c2 = encrypt("secret");
    expect(c1).not.toBe(c2);
  });

  it("ciphertext is base64url encoded", () => {
    expect(encrypt("test")).toMatch(/^[A-Za-z0-9_-]+=*$/);
  });

  it("throws on tampered ciphertext", () => {
    const ciphertext = encrypt("safe-value");
    const buf = Buffer.from(ciphertext, "base64url");
    buf[13] ^= 0xff;
    expect(() => decrypt(buf.toString("base64url"))).toThrow();
  });
});
