import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bridgeSignature, verifyBridgeRequest } from "@/lib/bridge-auth";
import { CALENDAR_PATH, externalBlocks, releaseNights, reserveNights } from "@/lib/website-calendar";

const SECRET = "test-secret-0123456789-abcdefghijklmnop";
const URL_ = "https://example.supabase.co/functions/v1/ops-calendar";
const ID = "0ae7a08b-75a8-4655-a487-783845cc8af6";
const stay = { bookingId: ID, slug: "villa-dunes", checkIn: "2026-11-10", checkOut: "2026-11-13", ota: false };

let fetchMock: ReturnType<typeof vi.fn>;
const answer = (status: number, json: unknown) => fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(json), { status }));

beforeEach(() => {
  vi.stubEnv("WEBSITE_CALENDAR_URL", URL_);
  vi.stubEnv("BRIDGE_SHARED_SECRET", SECRET);
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("website calendar", () => {
  it("signs every request the way the website verifies it, with the path pinned", async () => {
    answer(200, { ok: true, nights: 3, added: 3 });
    expect(await reserveNights(stay)).toEqual({ kind: "ok" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(URL_);
    const h = init.headers as Record<string, string>;
    expect(JSON.parse(init.body)).toEqual({ action: "reserve", ref: `app:${ID}`, slug: "villa-dunes", checkIn: "2026-11-10", checkOut: "2026-11-13", ota: false });
    expect(verifyBridgeRequest({ secret: SECRET, timestamp: h["x-jood-timestamp"], signature: h["x-jood-signature"], method: "POST", path: CALENDAR_PATH, body: init.body })).toEqual({ ok: true });
    expect(h["x-jood-signature"]).toBe(bridgeSignature(SECRET, h["x-jood-timestamp"], "POST", "/ops-calendar", init.body));
  });

  it("a conflict comes back with the website's own words", async () => {
    answer(409, { error: "date_conflict", message: "2026-11-11 is already taken by a booking on Airbnb." });
    expect(await reserveNights(stay)).toEqual({ kind: "conflict", message: "2026-11-11 is already taken by a booking on Airbnb." });
  });

  it("a property that is not on the website needs no block", async () => {
    answer(404, { error: "house_not_found" });
    expect(await reserveNights(stay)).toEqual({ kind: "not_on_website" });
  });

  it("never guesses: a network failure, a refusal or a server error is 'unavailable'", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(await reserveNights(stay)).toEqual({ kind: "unavailable" });
    answer(401, { error: "Not allowed." });
    expect(await reserveNights(stay)).toEqual({ kind: "unavailable" });
    answer(500, {});
    expect(await reserveNights(stay)).toEqual({ kind: "unavailable" });
  });

  it("is a no-op until it is configured (development, tests)", async () => {
    vi.stubEnv("WEBSITE_CALENDAR_URL", "");
    expect(await reserveNights(stay)).toEqual({ kind: "skipped" });
    expect(await releaseNights(ID)).toBe(true);
    expect(await externalBlocks(["villa-dunes"], "2026-10-01", "2027-01-01")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a plain-http or malformed calendar address", async () => {
    vi.stubEnv("WEBSITE_CALENDAR_URL", "http://example.com/ops-calendar");
    expect(await reserveNights(stay)).toEqual({ kind: "skipped" });
    vi.stubEnv("WEBSITE_CALENDAR_URL", "not a url");
    expect(await reserveNights(stay)).toEqual({ kind: "skipped" });
  });

  it("release reports whether the website confirmed it", async () => {
    answer(200, { ok: true, released: 3 });
    expect(await releaseNights(ID)).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ action: "release", ref: `app:${ID}` });
    answer(503, {});
    expect(await releaseNights(ID)).toBe(false);
  });

  it("blocks for the calendar: ranges in, and any trouble means nothing extra is shown", async () => {
    const ranges = [{ slug: "villa-dunes", kind: "airbnb", from: "2026-10-10", to: "2026-10-13" }];
    answer(200, { ranges });
    expect(await externalBlocks(["villa-dunes"], "2026-10-01", "2027-01-01")).toEqual(ranges);
    answer(500, {});
    expect(await externalBlocks(["villa-dunes"], "2026-10-01", "2027-01-01")).toEqual([]);
    answer(200, { ranges: "nope" });
    expect(await externalBlocks(["villa-dunes"], "2026-10-01", "2027-01-01")).toEqual([]);
    expect(await externalBlocks([], "2026-10-01", "2027-01-01")).toEqual([]);
  });
});
