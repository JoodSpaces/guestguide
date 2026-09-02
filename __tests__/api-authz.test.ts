/**
 * Authorization unit tests.
 *
 * Tests the pure authorization logic that guards every admin and guest endpoint.
 * These run without a Supabase connection — DB-touching paths are covered by E2E.
 */
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  isPathAllowed,
  signAdminCookie,
  requireSession,
  checkPropertyAccess,
  type AdminSession,
} from "@/lib/admin-auth";
import { hashToken, isTokenExpired } from "@/lib/token";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<AdminSession> = {}): AdminSession {
  return {
    id: "m-1",
    name: "Test",
    role: "admin",
    jti: "jti-test",
    iat: Date.now(),
    exp: Date.now() + 7 * 86400_000,
    ...overrides,
  };
}

async function requestWithCookie(cookie: string): Promise<NextRequest> {
  return new NextRequest("http://localhost/api/test", {
    headers: { Cookie: `jood_admin=${cookie}` },
  });
}

// ─── isPathAllowed ───────────────────────────────────────────────────────────

describe("isPathAllowed", () => {
  it("admin can access all paths", () => {
    expect(isPathAllowed("/admin", "admin")).toBe(true);
    expect(isPathAllowed("/admin/ops", "admin")).toBe(true);
    expect(isPathAllowed("/admin/team", "admin")).toBe(true);
    expect(isPathAllowed("/admin/bookings", "admin")).toBe(true);
    expect(isPathAllowed("/admin/properties/abc/guide", "admin")).toBe(true);
  });

  it("ops can access /admin/ops/* but not /admin, /admin/team, /admin/bookings", () => {
    expect(isPathAllowed("/admin/ops", "ops")).toBe(true);
    expect(isPathAllowed("/admin/ops/turnover/abc", "ops")).toBe(true);
    expect(isPathAllowed("/admin/ops/maintenance", "ops")).toBe(true);
    expect(isPathAllowed("/admin", "ops")).toBe(false);
    expect(isPathAllowed("/admin/team", "ops")).toBe(false);
    expect(isPathAllowed("/admin/bookings", "ops")).toBe(false);
    expect(isPathAllowed("/admin/requests", "ops")).toBe(false);
  });

  it("housekeeping can only access turnover and inventory", () => {
    expect(isPathAllowed("/admin/ops", "housekeeping")).toBe(true);
    expect(isPathAllowed("/admin/ops/turnover/abc", "housekeeping")).toBe(true);
    expect(isPathAllowed("/admin/ops/inventory/prop-1", "housekeeping")).toBe(true);
    expect(isPathAllowed("/admin/ops/maintenance", "housekeeping")).toBe(false);
    expect(isPathAllowed("/admin/bookings", "housekeeping")).toBe(false);
    expect(isPathAllowed("/admin/requests", "housekeeping")).toBe(false);
  });

  it("maintenance can only access /admin/ops/maintenance/*", () => {
    expect(isPathAllowed("/admin/ops/maintenance", "maintenance")).toBe(true);
    expect(isPathAllowed("/admin/ops/maintenance/new", "maintenance")).toBe(true);
    expect(isPathAllowed("/admin/ops", "maintenance")).toBe(false);
    expect(isPathAllowed("/admin/ops/turnover/abc", "maintenance")).toBe(false);
    expect(isPathAllowed("/admin/bookings", "maintenance")).toBe(false);
  });

  it("concierge can access requests and bookings only", () => {
    expect(isPathAllowed("/admin/requests", "concierge")).toBe(true);
    expect(isPathAllowed("/admin/requests/guest/abc", "concierge")).toBe(true);
    expect(isPathAllowed("/admin/bookings", "concierge")).toBe(true);
    expect(isPathAllowed("/admin/bookings/new", "concierge")).toBe(true);
    expect(isPathAllowed("/admin/ops", "concierge")).toBe(false);
    expect(isPathAllowed("/admin/team", "concierge")).toBe(false);
    expect(isPathAllowed("/admin/properties", "concierge")).toBe(false);
  });

  it("unknown role is denied everywhere", () => {
    expect(isPathAllowed("/admin", "unknown")).toBe(false);
    expect(isPathAllowed("/admin/ops", "unknown")).toBe(false);
  });
});

// ─── requireSession ──────────────────────────────────────────────────────────

describe("requireSession", () => {
  it("returns null when no cookie is present", async () => {
    const req = new NextRequest("http://localhost/api/test");
    expect(await requireSession(req)).toBeNull();
  });

  it("returns null when cookie is malformed", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { Cookie: "jood_admin=notavalidcookie" },
    });
    expect(await requireSession(req)).toBeNull();
  });

  it("returns the session for a valid signed cookie", async () => {
    const session = makeSession({ name: "Alice", role: "admin" });
    const cookie = await signAdminCookie(session);
    const req = await requestWithCookie(cookie);
    const result = await requireSession(req);
    expect(result?.name).toBe("Alice");
    expect(result?.role).toBe("admin");
  });

  it("returns null when role is not in allowedRoles", async () => {
    const session = makeSession({ role: "ops" });
    const cookie = await signAdminCookie(session);
    const req = await requestWithCookie(cookie);
    expect(await requireSession(req, ["admin"])).toBeNull();
  });

  it("returns session when role matches one of allowedRoles", async () => {
    const session = makeSession({ role: "concierge" });
    const cookie = await signAdminCookie(session);
    const req = await requestWithCookie(cookie);
    const result = await requireSession(req, ["admin", "concierge"]);
    expect(result?.role).toBe("concierge");
  });

  it("returns null for an expired session", async () => {
    const session = makeSession({ exp: Date.now() - 1000 });
    const cookie = await signAdminCookie(session);
    const req = await requestWithCookie(cookie);
    expect(await requireSession(req)).toBeNull();
  });

  it("rejects a cookie signed with a tampered payload", async () => {
    const session = makeSession({ role: "housekeeping" });
    const cookie = await signAdminCookie(session);
    // Flip the last 4 chars of the signature
    const tampered = cookie.slice(0, -4) + "XXXX";
    const req = await requestWithCookie(tampered);
    expect(await requireSession(req)).toBeNull();
  });
});

// ─── Role escalation attempts ────────────────────────────────────────────────

describe("role escalation — requireSession with allowedRoles", () => {
  const escalationCases: Array<{ actualRole: AdminSession["role"]; tryingFor: AdminSession["role"][] }> = [
    { actualRole: "ops",          tryingFor: ["admin"] },
    { actualRole: "housekeeping", tryingFor: ["admin", "ops"] },
    { actualRole: "maintenance",  tryingFor: ["admin", "ops", "housekeeping"] },
    { actualRole: "concierge",    tryingFor: ["admin", "ops", "housekeeping", "maintenance"] },
  ];

  for (const { actualRole, tryingFor } of escalationCases) {
    it(`${actualRole} cannot escalate to [${tryingFor.join(", ")}]`, async () => {
      const session = makeSession({ role: actualRole });
      const cookie = await signAdminCookie(session);
      const req = await requestWithCookie(cookie);
      expect(await requireSession(req, tryingFor as AdminSession["role"][])).toBeNull();
    });
  }
});

// ─── checkPropertyAccess ────────────────────────────────────────────────────

describe("checkPropertyAccess — property scoping", () => {
  const propertyId = "prop-uuid-abc-123";

  it("admin has unrestricted access", () => {
    expect(checkPropertyAccess(makeSession({ role: "admin" }), propertyId)).toBe(true);
    expect(checkPropertyAccess(makeSession({ role: "admin" }), "any-other-prop")).toBe(true);
  });

  it("ops with null scope has full access", () => {
    expect(checkPropertyAccess(makeSession({ role: "ops", propertyIds: null }), propertyId)).toBe(true);
  });

  it("ops scoped to correct property is allowed", () => {
    const s = makeSession({ role: "ops", propertyIds: [propertyId, "other"] });
    expect(checkPropertyAccess(s, propertyId)).toBe(true);
  });

  it("ops scoped to different property is denied", () => {
    const s = makeSession({ role: "ops", propertyIds: ["different-prop"] });
    expect(checkPropertyAccess(s, propertyId)).toBe(false);
  });

  it("housekeeping with empty propertyIds is denied everywhere", () => {
    const s = makeSession({ role: "housekeeping", propertyIds: [] });
    expect(checkPropertyAccess(s, propertyId)).toBe(false);
  });

  it("maintenance scoped only to one property cannot access another", () => {
    const s = makeSession({ role: "maintenance", propertyIds: ["prop-1"] });
    expect(checkPropertyAccess(s, "prop-2")).toBe(false);
    expect(checkPropertyAccess(s, "prop-1")).toBe(true);
  });
});

// ─── Token validation (guest side) ──────────────────────────────────────────

describe("guest token format validation", () => {
  it("hashToken produces a 64-char hex string", () => {
    expect(hashToken("AAAAAAAAAAAAAAAAAAAAAA")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("same plaintext always produces the same hash", () => {
    const t = "BBBBBBBBBBBBBBBBBBBBBB";
    expect(hashToken(t)).toBe(hashToken(t));
  });

  it("different tokens produce different hashes", () => {
    expect(hashToken("AAAAAAAAAAAAAAAAAAAAAA")).not.toBe(hashToken("BBBBBBBBBBBBBBBBBBBBBB"));
  });

  it("isTokenExpired returns false for a future checkout", () => {
    const future = new Date(Date.now() + 10 * 86400_000).toISOString();
    expect(isTokenExpired(future)).toBe(false);
  });

  it("isTokenExpired returns true after 48h grace period", () => {
    // checkout was 3 days ago — well past the 48h grace
    const past = new Date(Date.now() - 3 * 86400_000).toISOString();
    expect(isTokenExpired(past)).toBe(true);
  });

  it("isTokenExpired returns false within 48h grace period", () => {
    // checkout was 24h ago — still within grace
    const recent = new Date(Date.now() - 24 * 3600_000).toISOString();
    expect(isTokenExpired(recent)).toBe(false);
  });
});
