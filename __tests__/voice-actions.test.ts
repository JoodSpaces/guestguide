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
