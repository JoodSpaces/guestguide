import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  refreshSession,
  requireSession,
  scopedPropertyIds,
  signAdminCookie,
  _resetMemberCache,
  type AdminSession,
} from "@/lib/admin-auth";

const ID = "11111111-1111-1111-1111-111111111111";

function session(over: Partial<AdminSession> = {}): AdminSession {
  return { id: ID, name: "Nour", role: "concierge", iat: Date.now(), exp: Date.now() + 86400_000, ...over };
}

function stubMember(row: object | null, ok = true) {
  const fetchMock = vi.fn(async () => ({ ok, json: async () => (row ? [row] : []) }) as unknown as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  _resetMemberCache();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key-for-tests";
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("refreshSession", () => {
  it("rejects a member who has been deactivated since the cookie was issued", async () => {
    stubMember({ is_active: false, role: "concierge", property_ids: null });
    expect(await refreshSession(session())).toBeNull();
  });

  it("rejects a member who has been deleted", async () => {
    stubMember(null);
    expect(await refreshSession(session())).toBeNull();
  });

  it("takes role and property scope from the database, not the cookie", async () => {
    stubMember({ is_active: true, role: "housekeeping", property_ids: ["p-1"] });
    const out = await refreshSession(session({ role: "admin", propertyIds: null }));
    expect(out?.role).toBe("housekeeping");
    expect(out?.propertyIds).toEqual(["p-1"]);
  });

  it("fails closed when the database is unreachable or errors", async () => {
    stubMember(null, false);
    expect(await refreshSession(session())).toBeNull();
    _resetMemberCache();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }));
    expect(await refreshSession(session())).toBeNull();
  });

  it("caches the lookup so a page load is not one query per request", async () => {
    const f = stubMember({ is_active: true, role: "ops", property_ids: null });
    await refreshSession(session());
    await refreshSession(session());
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("refuses a session id that is not a uuid without calling the database", async () => {
    const f = stubMember({ is_active: true, role: "ops", property_ids: null });
    expect(await refreshSession(session({ id: "1;drop table" }))).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("is skipped when no database is configured", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const s = session();
    expect(await refreshSession(s)).toEqual(s);
  });
});

describe("requireSession with the live check", () => {
  it("blocks a deactivated member even though the cookie is valid and unexpired", async () => {
    stubMember({ is_active: false, role: "admin", property_ids: null });
    const cookie = await signAdminCookie(session({ role: "admin" }));
    const req = new NextRequest("http://localhost/api/x", { headers: { Cookie: `jood_admin=${cookie}` } });
    expect(await requireSession(req)).toBeNull();
  });

  it("enforces the demoted role, not the role in the cookie", async () => {
    stubMember({ is_active: true, role: "concierge", property_ids: null });
    const cookie = await signAdminCookie(session({ role: "admin" }));
    const req = new NextRequest("http://localhost/api/x", { headers: { Cookie: `jood_admin=${cookie}` } });
    expect(await requireSession(req, ["admin"])).toBeNull();
  });
});

describe("scopedPropertyIds", () => {
  it("is null (all properties) for admins and unscoped staff", () => {
    expect(scopedPropertyIds(session({ role: "admin", propertyIds: ["p-1"] }))).toBeNull();
    expect(scopedPropertyIds(session({ role: "ops", propertyIds: null }))).toBeNull();
  });
  it("is the list for scoped staff, including the empty list (deny all)", () => {
    expect(scopedPropertyIds(session({ role: "ops", propertyIds: ["p-1"] }))).toEqual(["p-1"]);
    expect(scopedPropertyIds(session({ role: "ops", propertyIds: [] }))).toEqual([]);
  });
});
