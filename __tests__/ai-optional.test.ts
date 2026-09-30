import { afterEach, describe, expect, it, vi } from "vitest";
import { aiEnabled } from "@/lib/ai";
import { classifyGuestRequest } from "@/lib/classify-request";

afterEach(() => vi.unstubAllEnvs());

describe("AI is optional", () => {
  it("is off without a key and on with one", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(aiEnabled()).toBe(false);
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    expect(aiEnabled()).toBe(true);
  });

  it("files a guest request as other/normal, without calling out, when there is no key", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(await classifyGuestRequest("the AC is broken")).toEqual({ category: "other", urgency: "normal" });
  });
});
