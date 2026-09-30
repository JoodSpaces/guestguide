import { beforeEach, describe, expect, it, vi } from "vitest";
import { sortAlerts, stockStatus } from "@/lib/inventory";

/**
 * Inventory API rules: stock changes are relative and recorded (through adjust_inventory), housekeeping only counts,
 * "remove" archives, duplicates and another property's items are refused with a message. The database is stood in.
 */
const PID = "0ae7a08b-75a8-4655-a487-783845cc8af6";
const IID = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";
const TASK = "2c9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";

const ctx = {
  role: "admin" as string,
  itemFound: true,
  insertError: null as null | { code?: string; message: string },
  rpcError: null as null | { message: string },
  damageInsertError: null as null | { code?: string; message: string },
  ownedItem: true,
  calls: [] as Array<{ table?: string; op: string; args?: unknown }>,
};
const rpcCalls = () => ctx.calls.filter((c) => c.op === "rpc");

vi.mock("@/lib/admin-auth", () => ({
  requireSession: async () => ({ id: "u1", role: ctx.role, name: "Mona", propertyIds: null }),
  forbidden: () => new Response(null, { status: 403 }),
  checkPropertyAccess: () => true,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    rpc: (name: string, args: unknown) => { ctx.calls.push({ op: "rpc", table: name, args }); return Promise.resolve({ data: name === "adjust_inventory" ? 7 : null, error: ctx.rpcError }); },
    from: (table: string) => {
      let op = "select";
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, is: () => q, order: () => q, in: () => q,
        insert: (row: unknown) => { op = "insert"; ctx.calls.push({ table, op, args: row }); return q; },
        update: (row: unknown) => { op = "update"; ctx.calls.push({ table, op, args: row }); return q; },
        delete: () => { op = "delete"; ctx.calls.push({ table, op }); return q; },
        maybeSingle: () => Promise.resolve({
          data: table === "turnover_tasks" ? { property_id: PID } : (table === "inventory_items" && (ctx.itemFound && ctx.ownedItem) ? { id: IID } : null), error: null,
        }),
        single: () => {
          if (table === "turnover_tasks") return Promise.resolve({ data: { property_id: PID }, error: null });
          if (table === "turnover_damage_items") return Promise.resolve(ctx.damageInsertError ? { data: null, error: ctx.damageInsertError } : { data: { id: "d1" }, error: null });
          return Promise.resolve(ctx.insertError ? { data: null, error: ctx.insertError } : { data: { id: IID }, error: null });
        },
        then: (res: (v: unknown) => unknown) => res({ data: op === "update" && table === "inventory_items" ? (ctx.itemFound ? [{ id: IID }] : []) : [], error: null }),
      };
      return q;
    },
  }),
}));

import { PATCH, DELETE } from "@/app/api/admin/ops/inventory/[propertyId]/[itemId]/route";
import { POST } from "@/app/api/admin/ops/inventory/[propertyId]/route";
import { POST as DAMAGE } from "@/app/api/admin/ops/turnover/[id]/damage/route";

const req = (body: unknown, method = "PATCH") => new Request("http://x", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) as never;
const itemParams = { params: Promise.resolve({ propertyId: PID, itemId: IID }) };
const propParams = { params: Promise.resolve({ propertyId: PID }) };

beforeEach(() => { ctx.role = "admin"; ctx.itemFound = true; ctx.ownedItem = true; ctx.insertError = null; ctx.rpcError = null; ctx.damageInsertError = null; ctx.calls = []; });

describe("the stock rule", () => {
  it("below par is low, zero is out, par 0 is not tracked, at par is fine", () => {
    expect(stockStatus(6, 6)).toBe("ok");
    expect(stockStatus(5, 6)).toBe("low");
    expect(stockStatus(0, 6)).toBe("critical");
    expect(stockStatus(0, 0)).toBe("unset");
    expect(stockStatus(9, 0)).toBe("unset");
  });
  it("alerts sort most urgent first (alphabetical order put critical last)", () => {
    const out = sortAlerts([{ severity: "low" }, { severity: "medium" }, { severity: "critical" }, { severity: "medium", created_at: "2026-01-02" }]);
    expect(out.map((a) => a.severity)).toEqual(["critical", "medium", "medium", "low"]);
  });
});

describe("changing stock", () => {
  it("a tap is a relative, recorded change, made by the signed-in person", async () => {
    const res = await PATCH(req({ delta: 3 }), itemParams);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, current_stock: 7 });
    expect(rpcCalls()[0]).toMatchObject({ table: "adjust_inventory", args: { p_property_id: PID, p_item_id: IID, p_delta: 3, p_set: null, p_actor: "Mona" } });
  });

  it("a recount is an absolute number, through the same recorded path", async () => {
    await PATCH(req({ current_stock: 12 }), itemParams);
    expect(rpcCalls()[0].args).toMatchObject({ p_delta: null, p_set: 12 });
  });

  it("delta and a recount together are refused", async () => {
    expect((await PATCH(req({ delta: 1, current_stock: 4 }), itemParams)).status).toBe(400);
    expect(rpcCalls()).toHaveLength(0);
  });

  it("an item that is not on this property (or was removed) is a 404", async () => {
    ctx.itemFound = false;
    expect((await PATCH(req({ delta: 1 }), itemParams)).status).toBe(404);
    expect(rpcCalls()).toHaveLength(0);
  });

  it("housekeeping can count stock but not change par, names or categories", async () => {
    ctx.role = "housekeeping";
    expect((await PATCH(req({ delta: -1 }), itemParams)).status).toBe(200);
    expect((await PATCH(req({ par_level: 10 }), itemParams)).status).toBe(403);
    expect((await PATCH(req({ name: "Renamed" }), itemParams)).status).toBe(403);
  });

  it("a new par applies the low-stock rule straight away", async () => {
    await PATCH(req({ par_level: 8 }), itemParams);
    expect(rpcCalls().map((c) => c.table)).toEqual(["check_low_stock"]);
  });

  it("a failed save says so instead of pretending", async () => {
    ctx.rpcError = { message: "boom" };
    const res = await PATCH(req({ delta: 1 }), itemParams);
    expect(res.status).toBe(500);
    expect((await res.json()).message).toContain("Could not save");
  });
});

describe("adding and removing items", () => {
  const item = { category: "linen", name: "Towels", unit: "pcs", par_level: 6, current_stock: 4 };

  it("the starting count is recorded like any other change, and the low-stock rule runs", async () => {
    const res = await POST(req(item, "POST"), propParams);
    expect(res.status).toBe(201);
    expect(rpcCalls()[0]).toMatchObject({ table: "adjust_inventory", args: { p_set: 4, p_actor: "Mona", p_note: "Initial count" } });
    expect(rpcCalls().map((c) => c.table)).toContain("check_low_stock");
  });

  it("a name already on the list is refused with a message that says what to do", async () => {
    ctx.insertError = { code: "23505", message: "duplicate key" };
    const res = await POST(req(item, "POST"), propParams);
    expect(res.status).toBe(409);
    expect((await res.json()).message).toContain("already on this property's list");
  });

  it("if the starting count fails, nothing half-made is left behind", async () => {
    ctx.rpcError = { message: "boom" };
    const res = await POST(req(item, "POST"), propParams);
    expect(res.status).toBe(500);
    expect(ctx.calls.some((c) => c.table === "inventory_items" && c.op === "delete")).toBe(true);
  });

  it("removing archives the item (history is kept) and closes its alerts", async () => {
    const res = await DELETE(req({}, "DELETE"), itemParams);
    expect(res.status).toBe(200);
    const upd = ctx.calls.filter((c) => c.op === "update");
    expect(upd[0]).toMatchObject({ table: "inventory_items" });
    expect((upd[0].args as { archived_at: string }).archived_at).toBeTruthy();
    expect(upd[1]).toMatchObject({ table: "inventory_alerts" });
    expect(ctx.calls.some((c) => c.op === "delete")).toBe(false);
  });

  it("removing something that is not there is a 404", async () => {
    ctx.itemFound = false;
    expect((await DELETE(req({}, "DELETE"), itemParams)).status).toBe(404);
  });
});

describe("damage on a turnover", () => {
  const dmg = { item_id: IID, quantity: 2, condition: "damaged" };
  const p = { params: Promise.resolve({ id: TASK }) };

  it("records damage for an item of this property", async () => {
    expect((await DAMAGE(req(dmg, "POST"), p)).status).toBe(201);
  });

  it("refuses another property's item (it would corrupt that stock)", async () => {
    ctx.ownedItem = false;
    const res = await DAMAGE(req(dmg, "POST"), p);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("unknown_item");
    expect(ctx.calls.some((c) => c.table === "turnover_damage_items" && c.op === "insert")).toBe(false);
  });

  it("reporting the same item twice on one turnover is a clear message, not a database error", async () => {
    ctx.damageInsertError = { code: "23505", message: 'duplicate key value violates unique constraint "uq_turnover_damage_item"' };
    const res = await DAMAGE(req(dmg, "POST"), p);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("already_reported");
    expect(JSON.stringify(body)).not.toContain("uq_turnover_damage_item");
  });
});
