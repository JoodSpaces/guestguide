import { describe, expect, it } from "vitest";
import { buildStaffRecords, buildTowerSnapshot, type RawTowerData } from "@/lib/tower-snapshot";

const NOW = Date.parse("2026-10-02T10:00:00Z");
const H = 3_600_000;
const iso = (offsetHours: number) => new Date(NOW + offsetHours * H).toISOString();
const base = (over: Partial<RawTowerData> = {}): RawTowerData => ({
  now: NOW,
  properties: [{ id: "p1", name: "Dunes Villa" }, { id: "p2", name: "Acasia Penthouse" }],
  bookings: [], requests: [], turnovers: [], maintenance: [], voice: [], ...over,
});
const bk = (o: Partial<RawTowerData["bookings"][number]> = {}) => ({ id: "b1", property_id: "p1", external_ref: null, check_in: iso(-48), check_out: iso(-24), status: "confirmed", ...o });

describe("buildTowerSnapshot", () => {
  it("is empty and safe for no data", () => {
    const s = buildTowerSnapshot(base());
    expect(s.emergencies).toEqual([]);
    expect(s.arrivals).toEqual([]);
    expect(s.errors).toEqual([]);
  });

  it("lists unresolved urgent requests with property and age, and nothing personal", () => {
    const s = buildTowerSnapshot(base({
      bookings: [bk({ id: "b1", check_in: iso(-10), check_out: iso(40) })],
      requests: [
        { id: "r1", booking_id: "b1", category: "maintenance", urgency: "urgent", status: "received", created_at: iso(-0.25) },
        { id: "r2", booking_id: "b1", category: "maintenance", urgency: "urgent", status: "resolved", created_at: iso(-5) },
        { id: "r3", booking_id: "b1", category: "supplies", urgency: "normal", status: "received", created_at: iso(-5) },
      ],
    }));
    expect(s.emergencies).toEqual([{ id: "r1", category: "maintenance", status: "received", property: "Dunes Villa", age_hours: 0.3 }]);
    expect(JSON.stringify(s)).not.toMatch(/body|guest_|phone|email|encrypted/);
  });

  it("checks the PREVIOUS stay's turnover for an arrival in the next 24h", () => {
    const s = buildTowerSnapshot(base({
      bookings: [bk({ id: "prev", check_in: iso(-60), check_out: iso(-2) }), bk({ id: "next", check_in: iso(5), check_out: iso(70) })],
      turnovers: [{ id: "t1", booking_id: "prev", property_id: "p1", status: "in_progress" }],
    }));
    expect(s.arrivals).toEqual([{ property: "Dunes Villa", property_id: "p1", check_in: iso(5), turnover: "in_progress" }]);
  });

  it("marks a missing turnover as 'missing', and a first-ever stay as null", () => {
    const s = buildTowerSnapshot(base({
      bookings: [bk({ id: "prev", check_in: iso(-60), check_out: iso(-2) }), bk({ id: "next", check_in: iso(5), check_out: iso(70) }), bk({ id: "first", property_id: "p2", check_in: iso(3), check_out: iso(50) })],
    }));
    const byProp = Object.fromEntries(s.arrivals.map((a) => [a.property, a.turnover]));
    expect(byProp).toEqual({ "Dunes Villa": "missing", "Acasia Penthouse": null });
  });

  it("ignores cancelled bookings and arrivals more than 24h away", () => {
    const s = buildTowerSnapshot(base({ bookings: [bk({ id: "x", check_in: iso(5), check_out: iso(60), status: "cancelled" }), bk({ id: "y", check_in: iso(30), check_out: iso(80) })] }));
    expect(s.arrivals).toEqual([]);
  });

  it("flags a checked-out stay (last 48h) that never got a turnover task", () => {
    const s = buildTowerSnapshot(base({ bookings: [bk({ id: "done", check_out: iso(-3) }), bk({ id: "old", check_out: iso(-100) })] }));
    expect(s.no_turnover_after_checkout).toEqual([{ property: "Dunes Villa", check_out: iso(-3) }]);
  });

  it("reports photo flags and finished jobs with no photos; null when the column is missing", () => {
    const t = [
      { id: "t1", booking_id: null, property_id: "p1", status: "ready", photo_review: { flags: [{}, {}] }, photo_count: 4 },
      { id: "t2", booking_id: null, property_id: "p2", status: "ready", photo_review: null, photo_count: 0 },
    ];
    const s = buildTowerSnapshot(base({ turnovers: t }));
    expect(s.photo).toEqual({ flagged: [{ task_id: "t1", property: "Dunes Villa", flags: 2 }], done_without_photos: [{ task_id: "t2", property: "Acasia Penthouse" }] });
    expect(buildTowerSnapshot(base({ turnovers: t, errors: ["photo_review_unavailable"] })).photo).toBeNull();
  });

  it("lists only urgent maintenance older than 24h", () => {
    const s = buildTowerSnapshot(base({ maintenance: [
      { id: "m1", property_id: "p1", title: "Leak", priority: "urgent", status: "open", created_at: iso(-30) },
      { id: "m2", property_id: "p1", title: "Fresh", priority: "urgent", status: "open", created_at: iso(-3) },
      { id: "m3", property_id: "p1", title: "Low", priority: "low", status: "open", created_at: iso(-90) },
    ] }));
    expect(s.maintenance_overdue).toEqual([{ id: "m1", property: "Dunes Villa", title: "Leak", age_hours: 30 }]);
  });

  it("exposes website-origin stays (JOOD-xxxxxx) for the extension cross-check, as Cairo dates", () => {
    const s = buildTowerSnapshot(base({ bookings: [bk({ external_ref: "JOOD-ABC123", check_in: iso(-10), check_out: iso(40) }), bk({ id: "b2", external_ref: "airbnb-9" })] }));
    expect(s.stays).toEqual([{ ref: "JOOD-ABC123", check_out: "2026-10-04" }]);
  });
});

import { summariseAccess, summariseDoorCodes, findFastTurnovers, buildTrend } from "@/lib/tower-snapshot";
import { cleanMeta } from "@/lib/audit";
import { getAiProbe, _resetProbeCache } from "@/lib/ai-probe";

describe("access summary", () => {
  const row = (action: string, hoursAgo: number, over: Partial<{ entity_id: string; meta: Record<string, unknown> }> = {}) => ({ action, entity_id: over.entity_id ?? null, meta: over.meta ?? null, created_at: iso(-hoursAgo) });
  it("counts failed and successful logins in the last 24h only", () => {
    const a = summariseAccess([row("login.failed", 1), row("login.failed", 20), row("login.failed", 30), row("login.success", 2)], {}, NOW);
    expect([a.failed_logins_24h, a.logins_24h]).toEqual([2, 1]);
  });
  it("lists team changes of the last 7 days with a name, falling back to the team table", () => {
    const a = summariseAccess([row("team.created", 5, { meta: { name: "Omar" } }), row("team.updated", 10, { entity_id: "m1" }), row("team.deleted", 24 * 9, { meta: { name: "Old" } })], { m1: "Sara" }, NOW);
    expect(a.team_changes_7d.map((c) => `${c.action}:${c.name}`)).toEqual(["created:Omar", "updated:Sara"]);
  });
});

describe("door codes, cleaning speed, trends", () => {
  it("groups failed second-factor attempts by property and ignores old ones", () => {
    const rows = [
      { action: "door_code_second_factor_failed", entity_id: "b1", meta: null, created_at: iso(-1) },
      { action: "door_code_second_factor_failed", entity_id: "b1", meta: null, created_at: iso(-2) },
      { action: "door_code_second_factor_failed", entity_id: "b2", meta: null, created_at: iso(-30) },
      { action: "door_code_revealed", entity_id: "b1", meta: null, created_at: iso(-3) },
    ];
    const d = summariseDoorCodes(rows, new Map([["b1", "Dunes Villa"], ["b2", "A04"]]), NOW);
    expect(d).toEqual({ failures_24h: [{ property: "Dunes Villa", failures: 2 }], reveals_24h: 1 });
  });
  it("flags a cleaning under 15 minutes on a checklist of 8+ items, nothing else", () => {
    const t = (id: string, mins: number | null) => ({ id, property_id: "p1", assigned_to: "Mona", started_at: mins == null ? null : iso(-1), completed_at: mins == null ? null : new Date(Date.parse(iso(-1)) + mins * 60000).toISOString() });
    const counts = new Map([["a", 12], ["b", 12], ["c", 4], ["d", 12]]);
    const out = findFastTurnovers([t("a", 6), t("b", 40), t("c", 5), t("d", null)], counts, () => "Dunes Villa");
    expect(out).toEqual([{ task_id: "a", property: "Dunes Villa", assigned_to: "Mona", minutes: 6, items: 12 }]);
  });
  it("counts urgent requests and maintenance per property for the last 30 days against the 30 before", () => {
    const tr = buildTrend(
      [{ created_at: iso(-24 * 5), property_id: "p1" }, { created_at: iso(-24 * 40), property_id: "p1" }, { created_at: iso(-24 * 2), property_id: null }],
      [{ created_at: iso(-24 * 3), property_id: "p1" }, { created_at: iso(-24 * 4), property_id: "p2" }], (id) => (id === "p1" ? "Dunes Villa" : "A04"), NOW);
    expect(tr.properties.find((p) => p.name === "Dunes Villa")).toEqual({ name: "Dunes Villa", urgent_30d: 1, urgent_prior: 1, maintenance_30d: 1, maintenance_prior: 0 });
    expect(tr.properties.find((p) => p.name === "A04")?.maintenance_30d).toBe(1);
  });
});

describe("audit helper and AI probe", () => {
  it("never stores secrets in audit metadata", () => {
    expect(cleanMeta({ role: "ops", password: "hunter2", token: "abc", new_password_hash: "x", name: "Omar" })).toEqual({ role: "ops", password: "[withheld]", token: "[withheld]", new_password_hash: "[withheld]", name: "Omar" });
  });
  it("reports 'not configured' as null, not as failure, and caches for an hour", async () => {
    _resetProbeCache();
    const a = await getAiProbe(NOW);
    expect(a.text).toBeNull(); expect(a.voice).toBeNull();
    const b = await getAiProbe(NOW + 10 * 60000);
    expect(b.checked_at).toBe(a.checked_at);
  });
});

import { buildDaily } from "@/lib/tower-snapshot";
describe("daily counts for baselines", () => {
  it("counts urgent requests and maintenance per property per Cairo day, ignores the current day and anything older than 90 days", () => {
    const d = buildDaily(
      [{ created_at: iso(-24 * 3), property_id: "p1" }, { created_at: iso(-24 * 3 - 1), property_id: "p1" }, { created_at: iso(-1), property_id: "p1" }, { created_at: iso(-24 * 120), property_id: "p1" }, { created_at: iso(-24 * 2), property_id: null }],
      [{ created_at: iso(-24 * 3), property_id: "p2" }], (id) => (id === "p1" ? "Dunes Villa" : "A04"), NOW);
    const total = (k: "urgent" | "maintenance", name: string) => d.rows.filter((r) => r.property === name).reduce((n, r) => n + r[k], 0);
    expect(total("urgent", "Dunes Villa")).toBe(2);          // the one from an hour ago is today, the 120-day-old one is outside the window
    expect(total("maintenance", "A04")).toBe(1);
    expect(d.rows.every((r) => r.day >= d.from && r.day <= d.to)).toBe(true);
    expect(d.rows.some((r) => r.property === "Dunes Villa" && r.day === d.rows.find((x) => x.urgent === 2)?.day)).toBe(true);
  });
});

describe("buildStaffRecords", () => {
  const team = [
    { id: "t1", name: "Ali", role: "housekeeping", is_active: true },
    { id: "t2", name: "Mona", role: "housekeeping", is_active: true },
    { id: "t3", name: "Sami", role: "maintenance", is_active: true },
    { id: "t4", name: "Boss", role: "admin", is_active: true },
    { id: "t5", name: "Gone", role: "housekeeping", is_active: false },
  ];
  const input = (over: Record<string, unknown> = {}) => ({
    team, tasks: [], itemCounts: new Map<string, number>(), tickets: [], now: NOW,
    propertyName: (id: string) => (id === "p1" ? "Dunes Villa" : "Acasia Penthouse"), bookingRef: (id: string) => (id === "b1" ? "JOOD-AAA111" : null), ...over,
  });

  it("lists housekeeping, maintenance, support and operations as staff, and leaves out admins and inactive people", () => {
    const r = buildStaffRecords(input());
    expect(r.staff.map((x) => [x.name, x.job])).toEqual([["Ali", "Housekeeping"], ["Mona", "Housekeeping"], ["Sami", "Maintenance"]]);
  });

  it("turns a finished cleaning into an action with its minutes, items, property and booking reference", () => {
    const r = buildStaffRecords(input({ tasks: [{ id: "k1", property_id: "p1", booking_id: "b1", assigned_to: "ali", started_at: iso(-10), completed_at: iso(-9.85), approved_at: iso(-9), approved_by: "t2" }], itemCounts: new Map([["k1", 30]]) }));
    expect(r.actions.map((a) => [a.kind, a.actor_id, a.property, a.booking_ref, a.detail])).toEqual([["cleaning done", "t1", "Dunes Villa", "JOOD-AAA111", "9 min, 30 items"], ["inspection", "t2", "Dunes Villa", "JOOD-AAA111", "checked after cleaning"]]);
  });

  it("matches a person by id or by name, and leaves out an action nobody can be named for", () => {
    const r = buildStaffRecords(input({ tasks: [
      { id: "a", property_id: "p1", booking_id: null, assigned_to: "t3", started_at: null, completed_at: iso(-5), approved_at: null, approved_by: null },
      { id: "b", property_id: "p1", booking_id: null, assigned_to: "someone who left", started_at: null, completed_at: iso(-5), approved_at: null, approved_by: null },
      { id: "c", property_id: "p1", booking_id: null, assigned_to: null, started_at: null, completed_at: iso(-5), approved_at: null, approved_by: null }] }));
    expect(r.actions.map((a) => a.id)).toEqual(["turnover:a"]);
  });

  it("keeps only the last 30 days and nothing in the future", () => {
    const r = buildStaffRecords(input({ tasks: [
      { id: "old", property_id: "p1", booking_id: null, assigned_to: "t1", started_at: null, completed_at: iso(-24 * 40), approved_at: null, approved_by: null },
      { id: "future", property_id: "p1", booking_id: null, assigned_to: "t1", started_at: null, completed_at: iso(24 * 3), approved_at: null, approved_by: null },
      { id: "fine", property_id: "p1", booking_id: null, assigned_to: "t1", started_at: null, completed_at: iso(-24 * 3), approved_at: null, approved_by: null }] }));
    expect(r.actions.map((a) => a.id)).toEqual(["turnover:fine"]);
  });

  it("turns a resolved repair into an action with only its category, and uses a booking reference only of our own shape", () => {
    const r = buildStaffRecords(input({ tickets: [{ id: "m1", property_id: "p2", category: "ac", resolved_at: iso(-3), resolved_by: "Sami" }], bookingRef: () => null }));
    expect(r.actions).toEqual([{ id: "repair:m1", at: iso(-3), actor_id: "t3", kind: "repair done", property: "Acasia Penthouse", booking_ref: null, detail: "ac" }]);
  });

  it("never carries a guest name, contact detail, door code or message text: only the fields the Control Tower asked for", () => {
    const r = buildStaffRecords(input({ tasks: [{ id: "k1", property_id: "p1", booking_id: "b1", assigned_to: "t1", started_at: iso(-10), completed_at: iso(-9), approved_at: null, approved_by: null, notes: "Guest Maria Lopez maria@mail.test +201000", damage_notes: "door code 4821" }] as never }));
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/Maria|maria@|\+201000|4821|notes/i);
    expect(Object.keys(r.actions[0]).sort()).toEqual(["actor_id", "at", "booking_ref", "detail", "id", "kind", "property"]);
    expect(Object.keys(r.staff[0]).sort()).toEqual(["id", "job", "name"]);
  });

  it("a snapshot with no staff data still carries empty lists, so an older reader is unaffected", () => {
    const s = buildTowerSnapshot(base());
    expect(s.staff).toEqual([]); expect(s.actions).toEqual([]);
  });
});
