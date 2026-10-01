import { describe, it, expect } from "vitest";
import { pickNudge, nudgeText, type NudgeCandidate } from "@/lib/stay-nudges";

// "Now" = 3 Oct 2026, 18:00 Cairo (15:00 UTC).
const NOW = Date.parse("2026-10-03T15:00:00Z");
const base: NudgeCandidate = {
  id: "b1", guestLang: "en", checkIn: "2026-09-30T12:00:00Z", checkOut: "2026-10-04T08:00:00Z", status: "confirmed", dnd: false,
  checkoutTime: "11:00", askedLateCheckout: false, alreadySent: [],
};

describe("stay nudges", () => {
  it("nudges the evening before check-out", () => {
    expect(pickNudge(base, NOW)).toBe("checkout_eve");
  });
  it("sends each only once", () => {
    expect(pickNudge({ ...base, alreadySent: ["checkout_eve"] }, NOW)).toBeNull();
  });
  it("stays quiet for Do Not Disturb, cancelled stays, and guests who already asked", () => {
    expect(pickNudge({ ...base, dnd: true }, NOW)).toBeNull();
    expect(pickNudge({ ...base, status: "cancelled" }, NOW)).toBeNull();
    expect(pickNudge({ ...base, askedLateCheckout: true }, NOW)).toBeNull();
  });
  it("checks in on the day after arrival, for stays of 3+ nights only", () => {
    const mid = { ...base, checkIn: "2026-10-02T12:00:00Z", checkOut: "2026-10-07T08:00:00Z" };
    expect(pickNudge(mid, NOW)).toBe("midstay");
    expect(pickNudge({ ...mid, checkOut: "2026-10-04T08:00:00Z" }, NOW)).toBe("checkout_eve"); // 2 nights ending tomorrow: the eve nudge wins
    expect(pickNudge({ ...mid, checkOut: "2026-10-05T08:00:00Z" }, NOW)).toBe("midstay");        // exactly 3 nights counts
    expect(pickNudge({ ...mid, checkOut: "2026-10-03T08:00:00Z" }, NOW)).toBeNull();            // a 1-night stay has no middle
  });
  it("does nothing for a stay that is not near an edge", () => {
    expect(pickNudge({ ...base, checkIn: "2026-09-25T12:00:00Z", checkOut: "2026-10-10T08:00:00Z" }, NOW)).toBeNull();
  });
  it("speaks the guest's language and names the real check-out time", () => {
    expect(nudgeText("checkout_eve", "en", "12:00").body).toMatch(/tomorrow at 12:00/);
    expect(nudgeText("checkout_eve", "ar", null).body).toMatch(/11:00/);
    expect(nudgeText("midstay", "ar", null).body).toMatch(/المساعد/);
  });
});
