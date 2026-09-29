import { describe, it, expect } from "vitest";
import { hhmm } from "@/lib/time";

describe("hhmm", () => {
  it("drops the seconds Postgres adds to a time column", () => {
    expect(hhmm("11:00:00")).toBe("11:00");
    expect(hhmm("15:30:45")).toBe("15:30");
  });
  it("pads a single-digit hour and passes HH:MM through", () => {
    expect(hhmm("9:05:00")).toBe("09:05");
    expect(hhmm("11:00")).toBe("11:00");
  });
  it("falls back for missing or unparseable input", () => {
    expect(hhmm(null, "11:00")).toBe("11:00");
    expect(hhmm("noon", "11:00")).toBe("11:00");
    expect(hhmm(undefined)).toBe("");
  });
});
