import { describe, it, expect } from "vitest";
import { planExtend } from "@/lib/bridge-extend";

// Check-out is 11:00 Cairo on the 13th = 09:00 UTC (Egypt is UTC+2 or +3: both land on the same Cairo date).
const base = { status: "confirmed", currentCheckOut: "2026-11-13T09:00:00Z", from: "2026-11-13", to: "2026-11-15" };

describe("extension plan", () => {
  it("extends a stay that ends where the extension starts", () => {
    expect(planExtend({ ...base, action: "extend" })).toEqual({ kind: "set", toDate: "2026-11-15" });
  });
  it("is idempotent: asking again after it was applied changes nothing", () => {
    expect(planExtend({ ...base, action: "extend", currentCheckOut: "2026-11-15T09:00:00Z" })).toEqual({ kind: "noop" });
  });
  it("refuses a stay that ends somewhere unexpected, is cancelled, or has finished", () => {
    expect(planExtend({ ...base, action: "extend", currentCheckOut: "2026-11-12T09:00:00Z" })).toEqual({ kind: "refuse", error: "unexpected_dates" });
    expect(planExtend({ ...base, action: "extend", status: "cancelled" })).toEqual({ kind: "refuse", error: "cancelled" });
    expect(planExtend({ ...base, action: "extend", status: "completed" })).toEqual({ kind: "refuse", error: "already_completed" });
  });
  it("a refund moves it back, once", () => {
    const now = "2026-11-15T09:00:00Z";
    expect(planExtend({ ...base, action: "revert", currentCheckOut: now })).toEqual({ kind: "set", toDate: "2026-11-13" });
    expect(planExtend({ ...base, action: "revert" })).toEqual({ kind: "noop" });
  });
  it("will not shorten a stay that was extended again after this one", () => {
    expect(planExtend({ ...base, action: "revert", currentCheckOut: "2026-11-17T09:00:00Z" })).toEqual({ kind: "refuse", error: "superseded" });
  });
});
