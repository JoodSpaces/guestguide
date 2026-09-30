import { describe, it, expect } from "vitest";
import { shouldSyncLocale } from "@/lib/locale";

describe("shouldSyncLocale", () => {
  it("first visit to an Arabic booking: switch to Arabic", () => {
    expect(shouldSyncLocale(undefined, "ar")).toBe(true);
  });
  it("first visit to an English booking: nothing to do", () => {
    expect(shouldSyncLocale(undefined, "en")).toBe(false);
  });
  it("a guest who already chose a language is never switched back", () => {
    expect(shouldSyncLocale("en", "ar")).toBe(false);  // Arabic booking, chose English
    expect(shouldSyncLocale("ar", "en")).toBe(false);  // English booking, chose Arabic
    expect(shouldSyncLocale("ar", "ar")).toBe(false);
  });
  it("a garbage cookie counts as no choice", () => {
    expect(shouldSyncLocale("fr", "ar")).toBe(true);
  });
});
