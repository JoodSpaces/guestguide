import { describe, it, expect } from "vitest";
import { memoryHit } from "@/lib/rate-limit";

describe("memoryHit", () => {
  it("allows up to the limit then blocks", () => {
    const store = new Map();
    const results = Array.from({ length: 5 }, () => memoryHit(store, "k", 3, 1000, 0));
    expect(results).toEqual([true, true, true, false, false]);
  });

  it("starts a fresh window after it expires", () => {
    const store = new Map();
    for (let i = 0; i < 4; i++) memoryHit(store, "k", 3, 1000, 0);
    expect(memoryHit(store, "k", 3, 1000, 1001)).toBe(true);
  });

  it("keeps separate budgets per key", () => {
    const store = new Map();
    for (let i = 0; i < 4; i++) memoryHit(store, "a", 3, 1000, 0);
    expect(memoryHit(store, "b", 3, 1000, 0)).toBe(true);
  });
});
