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
    expect(JSON.stringify(s)).not.toMatch(/body|guest_|door|phone|email/);
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
