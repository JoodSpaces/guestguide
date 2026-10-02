import { describe, expect, it } from "vitest";
import { buildTowerSnapshot, type RawTowerData } from "@/lib/tower-snapshot";

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
