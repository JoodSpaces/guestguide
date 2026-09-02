import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "crypto";

const HMAC_SECRET = "test-paymob-hmac-secret";

beforeAll(() => {
  process.env.PAYMOB_HMAC_SECRET = HMAC_SECRET;
});

function makeHmac(obj: Record<string, unknown>): string {
  const src = (obj.source_data as Record<string, unknown>) ?? {};
  const order = (obj.order as Record<string, unknown>) ?? {};
  const fields = [
    String(obj.amount_cents ?? ""),
    String(obj.created_at ?? ""),
    String(obj.currency ?? ""),
    String(obj.error_occured ?? ""),
    String(obj.has_parent_transaction ?? ""),
    String(obj.id ?? ""),
    String(obj.integration_id ?? ""),
    String(obj.is_3d_secure ?? ""),
    String(obj.is_auth ?? ""),
    String(obj.is_capture ?? ""),
    String(obj.is_refunded ?? ""),
    String(obj.is_standalone_payment ?? ""),
    String(obj.is_voided ?? ""),
    String(order.id ?? ""),
    String(obj.owner ?? ""),
    String(obj.pending ?? ""),
    String(src.pan ?? ""),
    String(src.sub_type ?? ""),
    String(src.type ?? ""),
    String(obj.success ?? ""),
  ];
  return createHmac("sha512", HMAC_SECRET).update(fields.join("")).digest("hex");
}

describe("verifyPaymobHmac", async () => {
  const { verifyPaymobHmac } = await import("@/lib/paymob");

  const payload = {
    amount_cents: 5000,
    created_at: "2025-01-15T10:00:00",
    currency: "EGP",
    error_occured: false,
    has_parent_transaction: false,
    id: 123456,
    integration_id: 789,
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: { id: 999 },
    owner: 111,
    pending: false,
    source_data: { pan: "1234", sub_type: "VISA", type: "card" },
    success: true,
  };

  it("accepts a valid HMAC", () => {
    expect(verifyPaymobHmac(payload, makeHmac(payload))).toBe(true);
  });

  it("rejects a tampered HMAC", () => {
    expect(verifyPaymobHmac(payload, makeHmac(payload).replace("a", "b"))).toBe(false);
  });

  it("rejects if success field changes", () => {
    const hmac = makeHmac(payload);
    expect(verifyPaymobHmac({ ...payload, success: false }, hmac)).toBe(false);
  });

  it("rejects if amount_cents changes", () => {
    const hmac = makeHmac(payload);
    expect(verifyPaymobHmac({ ...payload, amount_cents: 9999 }, hmac)).toBe(false);
  });

  it("rejects empty HMAC", () => {
    expect(verifyPaymobHmac(payload, "")).toBe(false);
  });
});
