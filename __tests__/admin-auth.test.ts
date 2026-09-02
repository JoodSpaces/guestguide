import { describe, it, expect } from "vitest";
import { checkPropertyAccess, hashPassword, verifyPassword, signAdminCookie, verifyAdminCookie } from "@/lib/admin-auth";

describe("checkPropertyAccess", () => {
  const base = { id: "1", name: "Test", jti: "x", iat: 0, exp: 9e12 };

  it("admin role always has access", () => {
    expect(checkPropertyAccess({ ...base, role: "admin" }, "any-uuid")).toBe(true);
  });

  it("ops with null propertyIds has full access", () => {
    expect(checkPropertyAccess({ ...base, role: "ops", propertyIds: null }, "any-uuid")).toBe(true);
  });

  it("ops with undefined propertyIds has full access (backward compat)", () => {
    expect(checkPropertyAccess({ ...base, role: "ops" }, "any-uuid")).toBe(true);
  });

  it("ops with matching propertyIds has access", () => {
    const id = "prop-uuid-1";
    expect(checkPropertyAccess({ ...base, role: "ops", propertyIds: [id, "other"] }, id)).toBe(true);
  });

  it("ops without matching propertyId is denied", () => {
    expect(checkPropertyAccess({ ...base, role: "ops", propertyIds: ["other-id"] }, "prop-uuid-1")).toBe(false);
  });

  it("housekeeping with empty list is denied everywhere", () => {
    expect(checkPropertyAccess({ ...base, role: "housekeeping", propertyIds: [] }, "any-uuid")).toBe(false);
  });
});

describe("hashPassword / verifyPassword", () => {
  it("verifies the correct password", async () => {
    const hash = await hashPassword("mysecret");
    expect(await verifyPassword("mysecret", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("mysecret");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces different hashes for same password (random salt)", async () => {
    const h1 = await hashPassword("same");
    const h2 = await hashPassword("same");
    expect(h1).not.toBe(h2);
  });

  it("uses pbkdf2 prefix", async () => {
    expect(await hashPassword("x")).toMatch(/^pbkdf2:/);
  });
});

describe("signAdminCookie / verifyAdminCookie", () => {
  const session = {
    id: "member-1",
    name: "Alice",
    role: "admin" as const,
    jti: "jti-test",
    iat: Date.now(),
    exp: Date.now() + 7 * 86400_000,
  };

  it("round-trips a valid session (skips Redis when not configured)", async () => {
    const cookie = await signAdminCookie(session);
    const decoded = await verifyAdminCookie(cookie);
    expect(decoded?.name).toBe("Alice");
    expect(decoded?.role).toBe("admin");
  });

  it("includes propertyIds in the decoded session", async () => {
    const cookie = await signAdminCookie({ ...session, propertyIds: ["p1", "p2"] });
    const decoded = await verifyAdminCookie(cookie);
    expect(decoded?.propertyIds).toEqual(["p1", "p2"]);
  });

  it("rejects a tampered signature", async () => {
    const cookie = await signAdminCookie(session);
    const bad = cookie.slice(0, -4) + "xxxx";
    expect(await verifyAdminCookie(bad)).toBeNull();
  });

  it("rejects an expired session", async () => {
    const expired = { ...session, exp: Date.now() - 1000 };
    const cookie = await signAdminCookie(expired);
    expect(await verifyAdminCookie(cookie)).toBeNull();
  });
});
