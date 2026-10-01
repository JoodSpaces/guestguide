import { describe, it, expect } from "vitest";
import { formatMemory } from "@/lib/voice-memory";

const empty = { priorCalls: [], requests: [], prefs: null, pastStays: [] };

describe("voice memory", () => {
  it("says nothing when there is nothing to say", () => {
    expect(formatMemory(empty)).toBe("");
    expect(formatMemory({ ...empty, prefs: { occasion: null, temp: null, notes: null } })).toBe("");
  });
  it("carries requests, preferences, earlier calls and a returning guest", () => {
    const t = formatMemory({
      pastStays: [{ property: "Villa Dunes", month: "March 2026" }],
      prefs: { occasion: "anniversary", temp: "22°C", notes: null },
      requests: [{ text: "AC is not cooling", status: "being handled", urgent: true }],
      priorCalls: [{ when: "Thursday 21:10", guestLines: ["is there a late checkout"], actions: ["lookup:check_late_checkout", "request_service", "unhandled:x"] }],
    });
    expect(t).toMatch(/Returning guest.*Villa Dunes, March 2026/);
    expect(t).toMatch(/anniversary/);
    expect(t).toMatch(/URGENT AC is not cooling \(being handled\)/);
    expect(t).toMatch(/asked about a late check-out, asked for a service/);
    expect(t).not.toMatch(/unhandled/);
    expect(t).toMatch(/never read it out/);
  });
  it("keeps it short", () => {
    const long = "x".repeat(500);
    const t = formatMemory({ ...empty, requests: Array.from({ length: 9 }, () => ({ text: long, status: "resolved", urgent: false })), priorCalls: [{ when: "now", guestLines: [long], actions: [] }] });
    expect(t.length).toBeLessThan(1200);
    expect(t.split("\n").filter((l) => l.startsWith("- ")).length).toBe(6);
  });
});
