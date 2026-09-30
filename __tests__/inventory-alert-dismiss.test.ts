import { beforeEach, describe, expect, it, vi } from "vitest";

const AID = "0ae7a08b-75a8-4655-a487-783845cc8af6";
const ctx = { found: true, role: "admin", updates: [] as unknown[] };

vi.mock("@/lib/admin-auth", () => ({
  requireSession: async (_r: unknown, roles: string[]) => (roles.includes(ctx.role) ? { id: "u", role: ctx.role, name: "Mona", propertyIds: null } : null),
  forbidden: () => new Response(null, { status: 403 }),
  checkPropertyAccess: () => true,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: () => {
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, is: () => q,
        update: (row: unknown) => { ctx.updates.push(row); return q; },
        maybeSingle: () => Promise.resolve({ data: ctx.found ? { id: AID, property_id: "p1" } : null, error: null }),
        then: (res: (v: unknown) => unknown) => res({ data: null, error: null }),
      };
      return q;
    },
  }),
}));

import { PATCH } from "@/app/api/admin/ops/inventory/alerts/[id]/route";
const call = () => PATCH(new Request("http://x", { method: "PATCH" }) as never, { params: Promise.resolve({ id: AID }) });
beforeEach(() => { ctx.found = true; ctx.role = "admin"; ctx.updates = []; });

describe("dismissing an inventory alert", () => {
  it("closes the alert and changes nothing else", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(ctx.updates).toHaveLength(1);
    expect(Object.keys(ctx.updates[0] as object)).toEqual(["resolved_at"]);
  });
  it("an alert that is already closed or missing is a 404", async () => {
    ctx.found = false;
    expect((await call()).status).toBe(404);
    expect(ctx.updates).toHaveLength(0);
  });
  it("housekeeping cannot dismiss alerts", async () => {
    ctx.role = "housekeeping";
    expect((await call()).status).toBe(403);
  });
});
