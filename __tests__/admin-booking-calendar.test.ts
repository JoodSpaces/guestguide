import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Adding a stay by hand must take its nights on the website first, so the same nights cannot be sold twice; and
 * cancelling must give them back. The website calendar and the database are stood in; these tests check the wiring.
 */
const PID = "0ae7a08b-75a8-4655-a487-783845cc8af6";
const inserted: Array<[string, Record<string, unknown>]> = [];
let bookingInsertFails = false;

const reserveNights = vi.fn();
const releaseNights = vi.fn();

vi.mock("@/lib/website-calendar", () => ({ reserveNights: (...a: unknown[]) => reserveNights(...a), releaseNights: (...a: unknown[]) => releaseNights(...a) }));
vi.mock("@/lib/admin-auth", () => ({
  requireSession: async () => ({ id: "admin-1", role: "admin", name: "A", propertyIds: null }),
  forbidden: () => new Response(null, { status: 403 }),
  scopedPropertyIds: () => null,
  checkPropertyAccess: () => true,
}));
vi.mock("@/lib/ops-turnover", () => ({ createScheduledTurnover: async () => undefined }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, in: () => q, lt: () => q, gt: () => q, limit: () => q, order: () => q, is: () => q, delete: () => q, update: () => q,
        returns: () => Promise.resolve({ data: [], error: null }),
        insert: (row: Record<string, unknown>) => { inserted.push([table, row]); return q; },
        single: () => {
          if (table === "properties") return Promise.resolve({ data: { id: PID, slug: "villa-dunes", specs: null }, error: null });
          if (table === "bookings" && bookingInsertFails) return Promise.resolve({ data: null, error: { message: "boom" } });
          return Promise.resolve({ data: { id: "row", property_id: PID, external_ref: null }, error: null });
        },
        then: (res: (v: unknown) => unknown) => res({ data: null, error: null }),
      };
      return q;
    },
  }),
}));

import { POST } from "@/app/api/admin/bookings/route";
import { PATCH } from "@/app/api/admin/bookings/[id]/route";

const post = (over: Record<string, unknown> = {}) =>
  POST(new Request("http://x/api/admin/bookings", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ propertyId: PID, guestFirstName: "Layla", guestLastName: "H", guestLang: "en", guestCount: 2,
      checkIn: "2026-11-10T14:00", checkOut: "2026-11-13T11:00", source: "direct", ...over }),
  }) as never);
const bookingRows = () => inserted.filter(([t]) => t === "bookings");

beforeEach(() => { inserted.length = 0; bookingInsertFails = false; reserveNights.mockReset(); releaseNights.mockReset(); releaseNights.mockResolvedValue(true); });

describe("a stay added by hand", () => {
  it("takes its nights on the website first, then saves under the same id", async () => {
    reserveNights.mockResolvedValue({ kind: "ok" });
    const res = await post();
    expect(res.status).toBe(200);
    const call = reserveNights.mock.calls[0][0];
    expect(call).toMatchObject({ slug: "villa-dunes", checkIn: "2026-11-10", checkOut: "2026-11-13", ota: false });
    expect(bookingRows()[0][1].id).toBe(call.bookingId);
  });

  it("is refused, and nothing is saved, when the website says the nights are taken", async () => {
    reserveNights.mockResolvedValue({ kind: "conflict", message: "2026-11-11 is already taken by a booking on Airbnb." });
    const res = await post();
    expect(res.status).toBe(409);
    expect((await res.json()).message).toContain("Airbnb");
    expect(bookingRows()).toHaveLength(0);
  });

  it("is refused, and nothing is saved, when the website cannot be reached (never guess)", async () => {
    reserveNights.mockResolvedValue({ kind: "unavailable" });
    const res = await post();
    expect(res.status).toBe(503);
    expect(bookingRows()).toHaveLength(0);
  });

  it("a house that is not on the website, or a link that is not set up, saves as before", async () => {
    reserveNights.mockResolvedValue({ kind: "not_on_website" });
    expect((await post()).status).toBe(200);
    reserveNights.mockResolvedValue({ kind: "skipped" });
    expect((await post()).status).toBe(200);
  });

  it("an Airbnb or Booking.com guest may sit on that channel's own block", async () => {
    reserveNights.mockResolvedValue({ kind: "ok" });
    await post({ source: "airbnb" });
    expect(reserveNights.mock.calls[0][0].ota).toBe(true);
  });

  it("a booking that came from the website is not asked again", async () => {
    await post({ externalRef: "JOOD-ABC123" });
    expect(reserveNights).not.toHaveBeenCalled();
  });

  it("gives the nights back if saving fails after they were taken", async () => {
    reserveNights.mockResolvedValue({ kind: "ok" });
    bookingInsertFails = true;
    const res = await post();
    expect(res.status).toBe(500);
    expect(releaseNights).toHaveBeenCalledWith(reserveNights.mock.calls[0][0].bookingId);
  });
});

describe("cancelling a stay", () => {
  const cancel = () => PATCH(new Request("http://x", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) }) as never,
    { params: Promise.resolve({ id: PID }) });

  it("gives its nights back on the website", async () => {
    const res = await cancel();
    expect(res.status).toBe(200);
    expect(releaseNights).toHaveBeenCalledWith(PID);
  });
});
