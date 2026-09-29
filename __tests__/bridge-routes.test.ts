/**
 * Route-level tests for the website bridge, against a small in-memory stand-in for
 * the Supabase tables the routes touch. They check behaviour (idempotency, conflict,
 * cancellation, auth), not SQL.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { bridgeSignature } from "@/lib/bridge-auth";
import { hashToken } from "@/lib/token";
import { deriveBridgeToken } from "@/lib/bridge-token";

const SECRET = "test-secret-0123456789-abcdefghijklmnop";
const KEY = "test-token-key-0123456789-abcdefghijklmnop";

type Row = Record<string, any>;
const db = {
  properties: [] as Row[], bookings: [] as Row[], stay_tokens: [] as Row[],
  audit_log: [] as Row[], turnover_tasks: [] as Row[], turnover_items: [] as Row[],
  // A concurrent request that creates the booking between our read and our insert.
  raceWinner: null as Row | null,
};
let seq = 0;

class Q {
  ops: [string, any[]][] = [];
  constructor(private table: keyof typeof db) {}
  private add(op: string, args: any[]) { this.ops.push([op, args]); return this; }
  select(...a: any[]) { return this.add("select", a); }
  insert(...a: any[]) { return this.add("insert", a); }
  update(...a: any[]) { return this.add("update", a); }
  delete(...a: any[]) { return this.add("delete", a); }
  eq(...a: any[]) { return this.add("eq", a); }
  is(...a: any[]) { return this.add("is", a); }
  in(...a: any[]) { return this.add("in", a); }
  lt(...a: any[]) { return this.add("lt", a); }
  gt(...a: any[]) { return this.add("gt", a); }
  limit(...a: any[]) { return this.add("limit", a); }
  returns() { return this; }
  maybeSingle() { return Promise.resolve(this.run(true)); }
  single() { return Promise.resolve(this.run(true)); }
  then(res: any, rej: any) { return Promise.resolve(this.run(false)).then(res, rej); }

  private has(op: string) { return this.ops.some(([o]) => o === op); }
  private arg(op: string) { return this.ops.find(([o]) => o === op)?.[1]; }
  private matches(r: Row) {
    for (const [o, a] of this.ops) {
      if (o === "eq" && r[a[0]] !== a[1]) return false;
      if (o === "is" && (r[a[0]] ?? null) !== a[1]) return false;
      if (o === "in" && !a[1].includes(r[a[0]])) return false;
      if (o === "lt" && !(r[a[0]] < a[1])) return false;
      if (o === "gt" && !(r[a[0]] > a[1])) return false;
    }
    return true;
  }
  private run(one: boolean): { data: any; error: any } {
    const rows = db[this.table] as Row[];
    if (this.has("insert")) {
      if (this.table === "bookings" && db.raceWinner) {
        rows.push(db.raceWinner);
        db.raceWinner = null;
        return { data: null, error: { code: "23505" } };
      }
      const src = this.arg("insert")![0];
      const list: Row[] = Array.isArray(src) ? src : [src];
      const made = list.map((r) => ({ id: `id-${++seq}`, ...r }));
      rows.push(...made);
      return { data: one ? made[0] : made, error: null };
    }
    if (this.has("update")) {
      const patch = this.arg("update")![0];
      rows.filter((r) => this.matches(r)).forEach((r) => Object.assign(r, patch));
      return { data: null, error: null };
    }
    if (this.has("delete")) {
      const keep = rows.filter((r) => !this.matches(r));
      rows.length = 0; rows.push(...keep);
      return { data: null, error: null };
    }
    const found = rows.filter((r) => this.matches(r));
    if (this.table === "bookings" && this.has("lt")) {
      // overlap query: also filter by property
      return { data: found, error: null };
    }
    return { data: one ? (found[0] ?? null) : found, error: null };
  }
}
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: () => ({ from: (t: keyof typeof db) => new Q(t) }) }));

const { POST: createStay } = await import("@/app/api/bridge/stays/route");
const { POST: cancelStay } = await import("@/app/api/bridge/stays/cancel/route");

const PROPERTY = { id: "prop-1", slug: "dunes-upper", specs: null, checkin_time: "15:00:00", checkout_time: "11:00:00" };
const payload = (over: Row = {}) => ({
  ref: "JOOD-ABC234", propertySlug: "dunes-upper",
  guest: { firstName: "Salma", lastName: "Hassan", email: "s@example.com", phone: "+201000000001", lang: "ar" },
  guestCount: 3, checkIn: "2026-11-10", checkOut: "2026-11-13", ...over,
});

function signed(path: string, body: unknown, over: { ts?: string; sig?: string; secret?: string } = {}) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const ts = over.ts ?? String(Math.floor(Date.now() / 1000));
  const sig = over.sig ?? bridgeSignature(over.secret ?? SECRET, ts, "POST", path, raw);
  return new NextRequest(`http://localhost${path}`, {
    method: "POST", body: raw,
    headers: { "content-type": "application/json", "x-jood-timestamp": ts, "x-jood-signature": sig },
  });
}

beforeEach(() => {
  process.env.BRIDGE_SHARED_SECRET = SECRET;
  process.env.BRIDGE_TOKEN_KEY = KEY;
  process.env.NEXT_PUBLIC_APP_URL = "https://stay.example.com";
  db.properties = [{ ...PROPERTY }]; db.bookings = []; db.stay_tokens = []; db.audit_log = [];
  db.turnover_tasks = []; db.turnover_items = []; db.raceWinner = null;
});

describe("POST /api/bridge/stays", () => {
  it("creates the stay, a link, a scheduled turnover, and returns the link", async () => {
    const res = await createStay(signed("/api/bridge/stays", payload()));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.created).toBe(true);
    expect(j.linkActive).toBe(true);
    const token = deriveBridgeToken(KEY, "JOOD-ABC234");
    expect(j.link).toBe(`https://stay.example.com/s/${token}`);

    expect(db.bookings).toHaveLength(1);
    const b = db.bookings[0];
    expect(b).toMatchObject({ source: "direct", external_ref: "JOOD-ABC234", status: "confirmed", guest_lang: "ar", guest_count: 3, door_code_encrypted: null });
    expect(b.guest_phone).not.toContain("+2010"); // stored encrypted, not plain
    expect(b.check_in).toBe("2026-11-10T13:00:00.000Z");   // 15:00 Cairo (UTC+2)
    expect(b.check_out).toBe("2026-11-13T09:00:00.000Z");  // 11:00 Cairo
    expect(db.stay_tokens).toHaveLength(1);
    expect(db.stay_tokens[0].token_hash).toBe(hashToken(token)); // only the hash is stored
    expect(JSON.stringify(db.stay_tokens)).not.toContain(token);
    expect(db.turnover_tasks[0]).toMatchObject({ status: "scheduled", property_id: "prop-1" });
    expect(db.turnover_items.length).toBeGreaterThan(0);
  });

  it("is idempotent: a retry returns the same link and creates nothing new", async () => {
    const first = await (await createStay(signed("/api/bridge/stays", payload()))).json();
    const again = await (await createStay(signed("/api/bridge/stays", payload()))).json();
    expect(again.created).toBe(false);
    expect(again.link).toBe(first.link);
    expect(again.bookingId).toBe(first.bookingId);
    expect(db.bookings).toHaveLength(1);
    expect(db.stay_tokens).toHaveLength(1);
    expect(db.turnover_tasks).toHaveLength(1);
  });

  it("survives a concurrent request winning the insert (unique-index 23505): re-reads and returns the same stay", async () => {
    db.raceWinner = { id: "winner", property_id: "prop-1", source: "direct", external_ref: "JOOD-ABC234", status: "confirmed", check_out: "2026-11-13T09:00:00.000Z" };
    const res = await createStay(signed("/api/bridge/stays", payload()));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.created).toBe(false);
    expect(j.bookingId).toBe("winner");
    expect(db.bookings.filter((b) => b.external_ref === "JOOD-ABC234")).toHaveLength(1);
    expect(db.stay_tokens).toHaveLength(1);
  });

  it("accepts the payload exactly as the website builds it, including missing contact details and a one-word name", async () => {
    // Mirror of buildCreatePayload() in the website repo (supabase/functions/_shared/bridge.ts).
    const fromWebsite = {
      ref: "JOOD-ABC234", propertySlug: "dunes-upper",
      guest: { firstName: "Madonna", lastName: "-", email: null, phone: null, lang: "en" },
      guestCount: 1, checkIn: "2026-11-10", checkOut: "2026-11-11",
    };
    const res = await createStay(signed("/api/bridge/stays", fromWebsite));
    expect(res.status).toBe(200);
    expect(db.bookings[0]).toMatchObject({ guest_first_name: "Madonna", guest_last_name: "-", guest_email: null, guest_phone: null });
  });

  it("refuses to double-book: a confirmed overlapping stay → 409 date_conflict, nothing created", async () => {
    db.bookings.push({ id: "other", property_id: "prop-1", status: "confirmed", check_in: "2026-11-11T13:00:00.000Z", check_out: "2026-11-14T09:00:00.000Z", source: "airbnb", external_ref: "HMXYZ" });
    const res = await createStay(signed("/api/bridge/stays", payload()));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("date_conflict");
    expect(db.bookings).toHaveLength(1);
    expect(db.stay_tokens).toHaveLength(0);
  });

  it("does not resurrect a cancelled stay", async () => {
    await createStay(signed("/api/bridge/stays", payload()));
    await cancelStay(signed("/api/bridge/stays/cancel", { ref: "JOOD-ABC234" }));
    const res = await createStay(signed("/api/bridge/stays", payload()));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("cancelled");
  });

  it("404s for a property the Guest App does not know", async () => {
    const res = await createStay(signed("/api/bridge/stays", payload({ propertySlug: "nope" })));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("property_not_found");
  });

  it("rejects bad input", async () => {
    for (const bad of [
      payload({ ref: "nope" }),
      payload({ checkOut: "2026-11-10" }),
      payload({ guestCount: 0 }),
      payload({ guest: { firstName: "", lastName: "x", lang: "en" } }),
      payload({ guest: { firstName: "a", lastName: "b", lang: "fr" } }),
    ]) {
      expect((await createStay(signed("/api/bridge/stays", bad))).status).toBe(400);
    }
    expect((await createStay(signed("/api/bridge/stays", "{not json"))).status).toBe(400);
    expect(db.bookings).toHaveLength(0);
  });

  it("is closed to anyone without a valid signature", async () => {
    const good = JSON.stringify(payload());
    const cases = [
      signed("/api/bridge/stays", good, { sig: "0".repeat(64) }),
      signed("/api/bridge/stays", good, { secret: "another-secret-another-secret-another" }),
      signed("/api/bridge/stays", good, { ts: String(Math.floor(Date.now() / 1000) - 3600) }),
      new NextRequest("http://localhost/api/bridge/stays", { method: "POST", body: good }),
    ];
    for (const req of cases) expect((await createStay(req)).status).toBe(401);
    expect(db.bookings).toHaveLength(0);
  });

  it("a signature for the cancel endpoint cannot be replayed against create", async () => {
    const body = JSON.stringify(payload());
    const ts = String(Math.floor(Date.now() / 1000));
    const sigForCancel = bridgeSignature(SECRET, ts, "POST", "/api/bridge/stays/cancel", body);
    expect((await createStay(signed("/api/bridge/stays", body, { ts, sig: sigForCancel }))).status).toBe(401);
  });

  it("fails closed when the secret is not configured", async () => {
    delete process.env.BRIDGE_SHARED_SECRET;
    expect((await createStay(signed("/api/bridge/stays", payload()))).status).toBe(401);
  });
});

describe("POST /api/bridge/stays/cancel", () => {
  it("cancels, revokes the link and removes the scheduled cleaning", async () => {
    await createStay(signed("/api/bridge/stays", payload()));
    const res = await cancelStay(signed("/api/bridge/stays/cancel", { ref: "JOOD-ABC234" }));
    expect(res.status).toBe(200);
    expect(db.bookings[0].status).toBe("cancelled");
    expect(db.stay_tokens[0].revoked_at).toBeTruthy();
    expect(db.turnover_tasks).toHaveLength(0);
    expect(db.audit_log.some((a) => a.action === "booking_cancelled")).toBe(true);
  });

  it("is idempotent", async () => {
    await createStay(signed("/api/bridge/stays", payload()));
    await cancelStay(signed("/api/bridge/stays/cancel", { ref: "JOOD-ABC234" }));
    const again = await cancelStay(signed("/api/bridge/stays/cancel", { ref: "JOOD-ABC234" }));
    expect(again.status).toBe(200);
    expect((await again.json()).alreadyCancelled).toBe(true);
  });

  it("404s for an unknown ref (nothing to undo)", async () => {
    expect((await cancelStay(signed("/api/bridge/stays/cancel", { ref: "JOOD-ZZZ999" }))).status).toBe(404);
  });

  it("will not touch a stay that already completed", async () => {
    await createStay(signed("/api/bridge/stays", payload()));
    db.bookings[0].status = "completed";
    const res = await cancelStay(signed("/api/bridge/stays/cancel", { ref: "JOOD-ABC234" }));
    expect(res.status).toBe(409);
    expect(db.bookings[0].status).toBe("completed");
  });

  it("requires a valid signature", async () => {
    await createStay(signed("/api/bridge/stays", payload()));
    expect((await cancelStay(signed("/api/bridge/stays/cancel", { ref: "JOOD-ABC234" }, { sig: "0".repeat(64) }))).status).toBe(401);
    expect(db.bookings[0].status).toBe("confirmed");
  });
});
