import { describe, it, expect, afterEach } from "vitest";
import { describeExtend, describeExtensionPay, isWebsiteRef, appOrigin } from "@/lib/voice-actions";
import { isPayUrl, checkoutUrl } from "@/lib/website-calendar";

const available = { kind: "available" as const, from: "2026-11-13", to: "2026-11-15", nights: 2, usd: 250, egp: 13000 };

describe("extension: paying online", () => {
  it("offers the pay flow (EGP or USD) only when the guest can pay online and a price exists", () => {
    expect(describeExtend(available, true)).toMatch(/Egyptian pounds \(EGP\) or in US dollars \(USD\).*start_extension/);
    expect(describeExtend(available, true)).toMatch(/Never say it is booked/);
    expect(describeExtend(available, false)).toMatch(/request_service/);
    expect(describeExtend({ ...available, usd: null, egp: null }, true)).toMatch(/request_service/);
  });
  it("only stays that came from a paid website booking are eligible", () => {
    expect(isWebsiteRef("JOOD-AB23CD")).toBe(true);
    expect(isWebsiteRef("airbnb-123")).toBe(false);
    expect(isWebsiteRef(null)).toBe(false);
  });
  it("only Stripe and Paymob pages can become a button", () => {
    expect(isPayUrl("https://checkout.stripe.com/c/pay/cs_test_1")).toBe(true);
    expect(isPayUrl("https://accept.paymob.com/api/acceptance/iframes/1?payment_token=x")).toBe(true);
    expect(isPayUrl("http://checkout.stripe.com/x")).toBe(false);
    expect(isPayUrl("https://checkout.stripe.com.evil.example/x")).toBe(false);
    expect(isPayUrl("javascript:alert(1)")).toBe(false);
    expect(isPayUrl(undefined)).toBe(false);
  });
  it("turns the website's answer into a button and plain instructions", () => {
    const ok = describeExtensionPay({ kind: "ok", url: "https://checkout.stripe.com/c/1", amount: 250, currency: "USD", totalUsd: 250, nights: 2, from: "2026-11-13", to: "2026-11-15", holdMinutes: 30 }, false);
    expect(ok.pay).toEqual({ url: "https://checkout.stripe.com/c/1", label: "Pay 250 USD for 2 extra nights" });
    expect(ok.result).toMatch(/held for 30 minutes/);
    expect(ok.result).toMatch(/do not say it is booked yet/);
    const egp = describeExtensionPay({ kind: "ok", url: "https://accept.paymob.com/x", amount: 13000, currency: "EGP", totalUsd: 250, nights: 1, from: "a", to: "b", holdMinutes: 30 }, true);
    expect(egp.pay?.label).toMatch(/13,000 EGP/);
    for (const kind of ["conflict", "not_extendable", "unavailable"] as const) {
      const r = describeExtensionPay(kind === "conflict" ? { kind, message: "x" } : { kind }, false);
      expect(r.pay).toBeNull();
      expect(r.result).toMatch(/team|taken/);
    }
  });
});

describe("website addresses", () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });
  it("finds create-checkout next to ops-calendar", () => {
    process.env.WEBSITE_CALENDAR_URL = "https://abc.supabase.co/functions/v1/ops-calendar";
    expect(checkoutUrl()).toBe("https://abc.supabase.co/functions/v1/create-checkout");
    process.env.WEBSITE_CALENDAR_URL = "https://abc.supabase.co/functions/v1/other";
    expect(checkoutUrl()).toBeNull();
    delete process.env.WEBSITE_CALENDAR_URL;
    expect(checkoutUrl()).toBeNull();
  });
  it("knows its own origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://guest.example.com/";
    expect(appOrigin()).toBe("https://guest.example.com");
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "x.vercel.app";
    expect(appOrigin()).toBe("https://x.vercel.app");
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    expect(appOrigin()).toBeNull();
  });
});
