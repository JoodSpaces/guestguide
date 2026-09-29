import { describe, it, expect } from "vitest";
import { bridgeSignature, verifyBridgeRequest, BRIDGE_MAX_SKEW_SECONDS } from "@/lib/bridge-auth";
import { deriveBridgeToken, BRIDGE_REF_RE } from "@/lib/bridge-token";
import { cairoToUtcIso } from "@/lib/cairo-time";

const SECRET = "test-secret-0123456789-abcdefghijklmnop";
const KEY = "test-token-key-0123456789-abcdefghijklmnop";

// The same vectors are asserted by the website's Deno suite (supabase/functions/_shared/bridge.test.ts).
// If either side changes the algorithm, one of the two suites fails.
const VECTOR = {
  ts: "1790000000", method: "POST", path: "/api/bridge/stays", body: '{"ref":"JOOD-ABC234"}',
  sig: "b9219ec91f6d1ddcc846f62872edd9b25ea25b6fdd1a578be6c8a49b5abc360a",
  token: "ouvaGc8-kvEHfnmw_Uak8m",
};

describe("bridge signature", () => {
  it("matches the cross-runtime test vector", () => {
    expect(bridgeSignature(SECRET, VECTOR.ts, VECTOR.method, VECTOR.path, VECTOR.body)).toBe(VECTOR.sig);
  });

  const good = () => ({
    secret: SECRET, timestamp: VECTOR.ts, signature: VECTOR.sig, method: "POST",
    path: VECTOR.path, body: VECTOR.body, nowMs: Number(VECTOR.ts) * 1000,
  });

  it("accepts a correct, fresh request", () => {
    expect(verifyBridgeRequest(good())).toEqual({ ok: true });
  });

  it("rejects a tampered body, path or method", () => {
    expect(verifyBridgeRequest({ ...good(), body: '{"ref":"JOOD-ZZZZZZ"}' })).toMatchObject({ ok: false, reason: "bad_signature" });
    expect(verifyBridgeRequest({ ...good(), path: "/api/bridge/stays/cancel" })).toMatchObject({ ok: false, reason: "bad_signature" });
    expect(verifyBridgeRequest({ ...good(), method: "GET" })).toMatchObject({ ok: false, reason: "bad_signature" });
  });

  it("rejects a stale or future timestamp (replay window)", () => {
    const t = Number(VECTOR.ts) * 1000;
    expect(verifyBridgeRequest({ ...good(), nowMs: t + (BRIDGE_MAX_SKEW_SECONDS + 1) * 1000 })).toMatchObject({ reason: "stale" });
    expect(verifyBridgeRequest({ ...good(), nowMs: t - (BRIDGE_MAX_SKEW_SECONDS + 1) * 1000 })).toMatchObject({ reason: "stale" });
    expect(verifyBridgeRequest({ ...good(), nowMs: t + (BRIDGE_MAX_SKEW_SECONDS - 1) * 1000 })).toEqual({ ok: true });
  });

  it("rejects missing headers and a wrong-length signature without throwing", () => {
    expect(verifyBridgeRequest({ ...good(), signature: null })).toMatchObject({ reason: "missing_headers" });
    expect(verifyBridgeRequest({ ...good(), timestamp: null })).toMatchObject({ reason: "missing_headers" });
    expect(verifyBridgeRequest({ ...good(), signature: "abc" })).toMatchObject({ reason: "bad_signature" });
  });

  it("never validates when the secret is unset or weak", () => {
    expect(verifyBridgeRequest({ ...good(), secret: undefined })).toMatchObject({ reason: "not_configured" });
    expect(verifyBridgeRequest({ ...good(), secret: "" })).toMatchObject({ reason: "not_configured" });
    // A signature made with a short secret must not pass even though it is "correct" for that secret.
    const weak = "short";
    const sig = bridgeSignature(weak, VECTOR.ts, "POST", VECTOR.path, VECTOR.body);
    expect(verifyBridgeRequest({ ...good(), secret: weak, signature: sig })).toMatchObject({ reason: "not_configured" });
  });
});

describe("deriveBridgeToken", () => {
  it("matches the cross-runtime test vector", () => {
    expect(deriveBridgeToken(KEY, "JOOD-ABC234")).toBe(VECTOR.token);
  });

  it("is deterministic and 22 URL-safe characters (same shape as a normal stay token)", () => {
    const t = deriveBridgeToken(KEY, "JOOD-ABC234");
    expect(t).toBe(deriveBridgeToken(KEY, "JOOD-ABC234"));
    expect(t).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("differs per booking, per version and per key", () => {
    const base = deriveBridgeToken(KEY, "JOOD-ABC234");
    expect(deriveBridgeToken(KEY, "JOOD-ABC235")).not.toBe(base);
    expect(deriveBridgeToken(KEY, "JOOD-ABC234", 1)).not.toBe(base);
    expect(deriveBridgeToken(KEY + "x", "JOOD-ABC234")).not.toBe(base);
  });

  it("refuses a missing/short key and a malformed ref", () => {
    expect(() => deriveBridgeToken(undefined, "JOOD-ABC234")).toThrow();
    expect(() => deriveBridgeToken("short", "JOOD-ABC234")).toThrow();
    expect(() => deriveBridgeToken(KEY, "not-a-ref")).toThrow();
  });

  it("the ref pattern accepts what the website generates", () => {
    expect(BRIDGE_REF_RE.test("JOOD-7K3MQ2")).toBe(true);
    expect(BRIDGE_REF_RE.test("JOOD-abc234")).toBe(false);
    expect(BRIDGE_REF_RE.test("JOOD-ABC23")).toBe(false);
  });
});

describe("cairoToUtcIso", () => {
  it("uses UTC+2 in winter", () => {
    expect(cairoToUtcIso("2026-11-10", "15:00:00")).toBe("2026-11-10T13:00:00.000Z");
  });
  it("uses UTC+3 in summer (Egypt observes daylight saving)", () => {
    expect(cairoToUtcIso("2026-07-10", "15:00:00")).toBe("2026-07-10T12:00:00.000Z");
    expect(cairoToUtcIso("2026-07-13", "11:00")).toBe("2026-07-13T08:00:00.000Z");
  });
  it("rejects garbage", () => {
    expect(() => cairoToUtcIso("10/11/2026", "15:00")).toThrow();
    expect(() => cairoToUtcIso("2026-11-10", "3pm")).toThrow();
  });
});

import { cairoHour, cairoDay } from "@/lib/cairo-time";

describe("cairoHour / cairoDay", () => {
  it("reads the hour in Cairo, not in the server's zone", () => {
    expect(cairoHour(Date.parse("2026-11-10T22:30:00Z"))).toBe(0);   // 00:30 next day, UTC+2
    expect(cairoHour(Date.parse("2026-07-10T21:30:00Z"))).toBe(0);   // 00:30 next day, UTC+3 (summer)
    expect(cairoHour(Date.parse("2026-11-10T09:00:00Z"))).toBe(11);
  });
  it("'today' is the Cairo day: just after Cairo midnight it is already tomorrow (UTC still says yesterday)", () => {
    const d = cairoDay(Date.parse("2026-09-29T21:37:00Z"));           // 00:37 on 30 Sep in Cairo (UTC+3)
    expect(d.date).toBe("2026-09-30");
    expect(d.startIso).toBe("2026-09-29T21:00:00.000Z");
    expect(d.endIso).toBe("2026-09-30T20:59:59.000Z");
  });
});
