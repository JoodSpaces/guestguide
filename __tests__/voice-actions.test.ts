import { describe, it, expect } from "vitest";
import { lateCheckoutVerdict as v, toMin, fromMin, isEmergencyKind, emergencyGuidance, describeLateVerdict } from "@/lib/voice-actions";

const base = { standard: "11:00", calendarKnown: true };

describe("late check-out verdict", () => {
  it("parses 24h and am/pm times", () => {
    expect(toMin("15:00")).toBe(900);
    expect(toMin("3pm")).toBe(900);
    expect(toMin("3:30 p.m.")).toBe(930);
    expect(toMin("12am")).toBe(0);
    expect(toMin("12pm")).toBe(720);
    expect(Number.isNaN(toMin("late"))).toBe(true);
    expect(Number.isNaN(toMin("25:00"))).toBe(true);
    expect(fromMin(870)).toBe("14:30");
  });
  it("needs nothing when the time is not later than normal", () => {
    expect(v({ ...base, requested: "10:30", nextArrival: null })).toEqual({ kind: "already_ok" });
  });
  it("is clear when nobody arrives that day, capped at 18:00", () => {
    expect(v({ ...base, requested: "15:00", nextArrival: null })).toEqual({ kind: "clear", offerUntil: "15:00", capped: false });
    expect(v({ ...base, requested: "21:00", nextArrival: null })).toEqual({ kind: "clear", offerUntil: "18:00", capped: true });
  });
  it("keeps four hours for the turnover before a same-day arrival", () => {
    expect(v({ ...base, requested: "13:00", nextArrival: "17:00" })).toEqual({ kind: "clear", offerUntil: "13:00", capped: false });
    expect(v({ ...base, requested: "15:00", nextArrival: "17:00" })).toEqual({ kind: "partial", offerUntil: "13:00", nextArrival: "17:00" });
  });
  it("says no when there is no room at all", () => {
    expect(v({ ...base, requested: "13:00", nextArrival: "14:00" })).toEqual({ kind: "unavailable", nextArrival: "14:00" });
  });
  it("never guesses when the calendar could not be checked", () => {
    expect(v({ ...base, requested: "15:00", nextArrival: null, calendarKnown: false })).toEqual({ kind: "unknown" });
  });
  it("rejects an unreadable time", () => {
    expect(v({ ...base, requested: "whenever", nextArrival: null })).toEqual({ kind: "invalid" });
  });
  it("tells the agent never to promise", () => {
    const t = describeLateVerdict({ kind: "clear", offerUntil: "15:00", capped: false }, "11:00", "15:00", "Do not quote a price.");
    expect(t).toMatch(/team will confirm/);
    expect(t).toMatch(/Never say it is approved/);
  });
});

describe("emergencies", () => {
  it("accepts only known kinds", () => {
    expect(isEmergencyKind("gas")).toBe(true);
    expect(isEmergencyKind("noise")).toBe(false);
  });
  it("gives the right Egyptian emergency number", () => {
    expect(emergencyGuidance("fire")).toMatch(/180/);
    expect(emergencyGuidance("medical")).toMatch(/123/);
    expect(emergencyGuidance("security")).toMatch(/122/);
  });
});

import { extendVerdict, describeExtend, MAX_EXTENSION_NIGHTS } from "@/lib/voice-actions";

describe("extend stay", () => {
  const from = "2026-11-13";
  const ok = { kind: "ok" as const, available: true as const, nights: 2, totalUsd: 250, totalEgp: 13000 };
  it("quotes a free stretch with the website's price, no cleaning fee", () => {
    const v = extendVerdict({ nights: 2, from, appClash: null, website: ok });
    expect(v).toEqual({ kind: "available", from, to: "2026-11-15", nights: 2, usd: 250, egp: 13000 });
    const t = describeExtend(v);
    expect(t).toMatch(/13000 EGP \(250 USD\)/);
    expect(t).toMatch(/no cleaning fee/);
    expect(t).toMatch(/Do not send a payment link/);
  });
  it("refuses when the website says the nights are taken", () => {
    const v = extendVerdict({ nights: 2, from, appClash: null, website: { kind: "ok", available: false, message: "2026-11-14 is already taken by a booking on Airbnb." } });
    expect(v.kind).toBe("conflict");
    expect(describeExtend(v)).toMatch(/Airbnb/);
  });
  it("the app's own bookings win over a clear website", () => {
    expect(extendVerdict({ nights: 1, from, appClash: "Villa", website: ok }).kind).toBe("conflict");
  });
  it("never invents a price when the house has none or is not on the website", () => {
    for (const website of [{ kind: "no_rate" as const }, { kind: "not_on_website" as const }]) {
      const v = extendVerdict({ nights: 1, from, appClash: null, website });
      expect(v).toMatchObject({ kind: "available", usd: null });
      expect(describeExtend(v)).toMatch(/do not quote one/);
    }
  });
  it("does not guess when the website cannot be reached", () => {
    const v = extendVerdict({ nights: 1, from, appClash: null, website: { kind: "unavailable" } });
    expect(v).toEqual({ kind: "unknown" });
    expect(describeExtend(v)).toMatch(/Do not guess/);
  });
  it("limits the length and rejects nonsense", () => {
    expect(extendVerdict({ nights: MAX_EXTENSION_NIGHTS + 1, from, appClash: null, website: ok }).kind).toBe("too_long");
    expect(extendVerdict({ nights: 0, from, appClash: null, website: ok }).kind).toBe("invalid");
    expect(extendVerdict({ nights: 1.5, from, appClash: null, website: ok }).kind).toBe("invalid");
  });
});
