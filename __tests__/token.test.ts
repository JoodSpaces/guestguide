import { describe, it, expect } from "vitest";
import { generateToken, hashToken, computePhase, isArrivalUnlocked, isTokenExpired } from "@/lib/token";

describe("generateToken", () => {
  it("produces a 22-character string", () => {
    expect(generateToken()).toHaveLength(22);
  });

  it("produces URL-safe characters only", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateToken()).toMatch(/^[A-Za-z0-9_-]{22}$/);
    }
  });

  it("produces unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, generateToken));
    expect(tokens.size).toBe(100);
  });
});

describe("hashToken", () => {
  it("returns a 64-char hex string", () => {
    expect(hashToken("abc123")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", () => {
    expect(hashToken("hello")).toBe(hashToken("hello"));
  });

  it("differs for different inputs", () => {
    expect(hashToken("tokenA")).not.toBe(hashToken("tokenB"));
  });
});

describe("computePhase", () => {
  function daysFromNow(d: number): string {
    return new Date(Date.now() + d * 86400_000).toISOString();
  }

  it("returns anticipation when check-in is far future", () => {
    expect(computePhase(daysFromNow(30), daysFromNow(37))).toBe("anticipation");
  });

  it("returns preparation when check-in is 3–7 days away", () => {
    expect(computePhase(daysFromNow(4), daysFromNow(11))).toBe("preparation");
  });

  it("returns arrival within 48h before check-in", () => {
    expect(computePhase(daysFromNow(1), daysFromNow(8))).toBe("arrival");
  });

  it("returns settling in first 3h after check-in", () => {
    const checkIn = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    expect(computePhase(checkIn, daysFromNow(6))).toBe("settling");
  });

  it("returns living during mid-stay", () => {
    const checkIn = new Date(Date.now() - 2 * 86400_000).toISOString();
    const checkOut = new Date(Date.now() + 3 * 86400_000).toISOString();
    expect(computePhase(checkIn, checkOut)).toBe("living");
  });

  it("returns departure in last 24h", () => {
    const checkIn = new Date(Date.now() - 5 * 86400_000).toISOString();
    const checkOut = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    expect(computePhase(checkIn, checkOut)).toBe("departure");
  });

  it("returns afterglow 48h+ after check-out", () => {
    const checkIn = new Date(Date.now() - 10 * 86400_000).toISOString();
    const checkOut = new Date(Date.now() - 3 * 86400_000).toISOString();
    expect(computePhase(checkIn, checkOut)).toBe("afterglow");
  });
});

describe("isArrivalUnlocked", () => {
  it("is false when check-in is more than 48h away", () => {
    expect(isArrivalUnlocked(new Date(Date.now() + 3 * 86400_000).toISOString())).toBe(false);
  });

  it("is true when check-in is within 48h", () => {
    expect(isArrivalUnlocked(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())).toBe(true);
  });

  it("is true when check-in is in the past", () => {
    expect(isArrivalUnlocked(new Date(Date.now() - 86400_000).toISOString())).toBe(true);
  });
});

describe("isTokenExpired", () => {
  it("is false when check-out is in the future", () => {
    expect(isTokenExpired(new Date(Date.now() + 86400_000).toISOString())).toBe(false);
  });

  it("is false within the 48h grace period after check-out", () => {
    expect(isTokenExpired(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())).toBe(false);
  });

  it("is true after the 48h grace period", () => {
    expect(isTokenExpired(new Date(Date.now() - 3 * 86400_000).toISOString())).toBe(true);
  });
});
