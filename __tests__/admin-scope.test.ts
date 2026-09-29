import { describe, it, expect } from "vitest";
import { scopeFromHeaders } from "@/lib/admin-scope";

const h = (v: string | null) => ({ get: () => v });

describe("scopeFromHeaders", () => {
  it("empty or missing header means all properties", () => {
    expect(scopeFromHeaders(h(null))).toBeNull();
    expect(scopeFromHeaders(h(""))).toBeNull();
  });
  it("parses a list of property ids", () => {
    expect(scopeFromHeaders(h('["a","b"]'))).toEqual(["a", "b"]);
    expect(scopeFromHeaders(h("[]"))).toEqual([]);
  });
  it("fails closed on garbage", () => {
    expect(scopeFromHeaders(h("not json"))).toEqual([]);
    expect(scopeFromHeaders(h('{"a":1}'))).toEqual([]);
    expect(scopeFromHeaders(h('[1,"a",null]'))).toEqual(["a"]);
  });
});
