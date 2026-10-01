import { describe, it, expect } from "vitest";
import { groupGaps } from "@/lib/voice-gaps";

const it_ = (q: string, propertyId = "p1", at = "2026-10-02T10:00:00Z", who = "Sam") => ({ q, propertyId, propertyName: "Villa", at, who });

describe("voice gaps", () => {
  it("groups the same question asked differently", () => {
    const g = groupGaps([it_("Is there a dishwasher?"), it_("Where is the dishwasher soap", "p1", "2026-10-03T10:00:00Z", "Lia"), it_("Can I bring my dog?")]);
    expect(g).toHaveLength(2);
    expect(g[0].asked).toBe(2);
    expect(g[0].who.sort()).toEqual(["Lia", "Sam"]);
  });
  it("never groups across properties", () => {
    expect(groupGaps([it_("Is there a dishwasher?", "p1"), it_("Is there a dishwasher?", "p2")])).toHaveLength(2);
  });
  it("puts the most asked first", () => {
    const g = groupGaps([it_("dog allowed"), it_("pool heating cost"), it_("pool heating price")]);
    expect(g[0].questions[0]).toMatch(/pool/);
  });
  it("keeps questions with no meaningful words separate rather than merging them", () => {
    expect(groupGaps([it_("what is it"), it_("where is that")])).toHaveLength(2);
  });
});
