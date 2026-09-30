import { beforeEach, describe, expect, it, vi } from "vitest";

/** "Delete property" archives it: nothing cascades, it can be restored, and it stops taking bookings. */
const PID = "0ae7a08b-75a8-4655-a487-783845cc8af6";
const ctx = { calls: [] as Array<{ table: string; op: string; args?: unknown }>, property: { id: PID, slug: "villa-dunes", specs: null, archived_at: null as string | null } };

vi.mock("@/lib/admin-auth", () => ({
  requireSession: async () => ({ id: "a", role: "admin", name: "A", propertyIds: null }),
  forbidden: () => new Response(null, { status: 403 }),
  scopedPropertyIds: () => null,
  checkPropertyAccess: () => true,
}));
vi.mock("@/lib/website-calendar", () => ({ reserveNights: async () => ({ kind: "skipped" }), releaseNights: async () => true }));
vi.mock("@/lib/ops-turnover", () => ({ createScheduledTurnover: async () => undefined }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      let op = "select";
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, in: () => q, lt: () => q, gt: () => q, limit: () => q, order: () => q, is: () => q,
        update: (row: unknown) => { op = "update"; ctx.calls.push({ table, op, args: row }); return q; },
        delete: () => { op = "delete"; ctx.calls.push({ table, op }); return q; },
        insert: (row: unknown) => { op = "insert"; ctx.calls.push({ table, op, args: row }); return q; },
        returns: () => Promise.resolve({ data: [], error: null }),
        single: () => Promise.resolve(table === "properties"
          ? { data: op === "update" ? { id: PID, archived_at: (ctx.calls.find((c) => c.op === "update")?.args as { archived_at?: string | null })?.archived_at ?? null } : ctx.property, error: null }
          : { data: { id: "b1" }, error: null }),
        then: (res: (v: unknown) => unknown) => res({ data: null, error: null }),
      };
      return q;
    },
  }),
}));

import { PATCH, DELETE } from "@/app/api/admin/properties/[id]/route";
import { POST as NEW_BOOKING } from "@/app/api/admin/bookings/route";

const params = { params: Promise.resolve({ id: PID }) };
const json = (body: unknown, method: string) => new Request("http://x", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) as never;
beforeEach(() => { ctx.calls = []; ctx.property = { id: PID, slug: "villa-dunes", specs: null, archived_at: null }; });

describe("archiving a property", () => {
  it("DELETE archives: it sets archived_at and never deletes a row", async () => {
    const res = await DELETE(json({}, "DELETE"), params);
    expect(res.status).toBe(200);
    expect(ctx.calls.some((c) => c.op === "delete")).toBe(false);
    const upd = ctx.calls.find((c) => c.op === "update")!;
    expect(upd.table).toBe("properties");
    expect((upd.args as { archived_at: string }).archived_at).toBeTruthy();
  });

  it("PATCH { archived: false } restores it", async () => {
    await PATCH(json({ archived: false }, "PATCH"), params);
    expect((ctx.calls.find((c) => c.op === "update")!.args as { archived_at: unknown }).archived_at).toBeNull();
  });

  it("PATCH { archived: true } archives it, without touching other fields", async () => {
    await PATCH(json({ archived: true }, "PATCH"), params);
    const args = ctx.calls.find((c) => c.op === "update")!.args as Record<string, unknown>;
    expect(typeof args.archived_at).toBe("string");
    expect("archived" in args).toBe(false);
  });
});

describe("an archived property takes no bookings", () => {
  const booking = { propertyId: PID, guestFirstName: "L", guestLastName: "H", guestLang: "en", guestCount: 2, checkIn: "2026-11-10T14:00", checkOut: "2026-11-13T11:00", source: "direct" };
  it("a hand-made booking is refused with a message that says how to fix it", async () => {
    ctx.property.archived_at = "2026-09-30T00:00:00Z";
    const res = await NEW_BOOKING(json(booking, "POST"));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("property_archived");
    expect(body.message).toContain("Restore");
    expect(ctx.calls.some((c) => c.table === "bookings" && c.op === "insert")).toBe(false);
  });
  it("an active property still works", async () => {
    expect((await NEW_BOOKING(json(booking, "POST"))).status).toBe(200);
  });
});
