import { describe, it, expect } from "vitest";
import { rankEntries, tokens, nightsLeft, statusText, isVoiceReadTool } from "@/lib/voice-tools";

describe("voice read tools", () => {
  it("only the five read tools are accepted", () => {
    expect(isVoiceReadTool("get_services")).toBe(true);
    expect(isVoiceReadTool("reveal_code")).toBe(false);
    expect(isVoiceReadTool(undefined)).toBe(false);
  });
  it("drops filler words and normalises Arabic letters", () => {
    expect(tokens("Where is the pool?")).toEqual(["pool"]);
    expect(tokens("أين المسبح")).toEqual(tokens("اين المسبح"));
  });
  it("ranks title hits above body hits and ignores non-matches", () => {
    const e = [
      { title: "Parking", body: "Free spot next to the pool" },
      { title: "Pool rules", body: "Open 8 to 8" },
      { title: "Wi-Fi", body: "Router in the hall" },
    ];
    expect(rankEntries(e, "pool hours").map((x) => x.title)).toEqual(["Pool rules", "Parking"]);
    expect(rankEntries(e, "dishwasher")).toEqual([]);
    expect(rankEntries(e, "the")).toEqual([]);
  });
  it("counts nights left", () => {
    const now = new Date("2026-10-10T12:00:00Z").getTime();
    expect(nightsLeft("2026-10-08T12:00:00Z", "2026-10-13T12:00:00Z", now)).toEqual({ total: 5, left: 3 });
    expect(nightsLeft("2026-10-20T12:00:00Z", "2026-10-22T12:00:00Z", now).left).toBe(2);
    expect(nightsLeft("2026-10-01T12:00:00Z", "2026-10-05T12:00:00Z", now).left).toBe(0);
  });
  it("explains request status in plain words, both languages", () => {
    expect(statusText("in_progress", false)).toMatch(/handled/);
    expect(statusText("in_progress", true)).toMatch(/الفريق/);
    expect(statusText("weird_new", false)).toBe("weird new");
  });
});
