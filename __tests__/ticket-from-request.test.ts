import { describe, expect, it } from "vitest";
import { guessTicketCategory, ticketTitle } from "@/lib/ticket-from-request";

describe("guest request → maintenance ticket", () => {
  it("picks a category from the guest's own words", () => {
    expect(guessTicketCategory("The air conditioner in the master bedroom is not cooling")).toBe("ac");
    expect(guessTicketCategory("There is a leak under the kitchen sink")).toBe("plumbing");
    expect(guessTicketCategory("The bathroom light keeps flickering")).toBe("electrical");
    expect(guessTicketCategory("The pool pump is noisy")).toBe("pool");
    expect(guessTicketCategory("The fridge is warm")).toBe("appliance");
    expect(guessTicketCategory("The door lock is stuck")).toBe("structural");
    expect(guessTicketCategory("المكيف لا يبرّد")).toBe("ac");
    expect(guessTicketCategory("Please bring extra pillows")).toBe("general");
  });

  it("makes a short title from the first sentence", () => {
    expect(ticketTitle("The tap is dripping. It started last night and gets worse.")).toBe("The tap is dripping.");
    const long = "A".repeat(120);
    expect(ticketTitle(long).length).toBeLessThanOrEqual(80);
    expect(ticketTitle(long).endsWith("…")).toBe(true);
    expect(ticketTitle("  spaced \n out  ")).toBe("spaced out");
  });
});
