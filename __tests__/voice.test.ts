import { describe, it, expect, afterEach } from "vitest";
import { voiceMonthlyMinutes, monthStartIso, voiceEnabled } from "@/lib/voice";

describe("voice limits", () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it("defaults to 12 minutes and accepts an override", () => {
    delete process.env.VOICE_MONTHLY_MINUTES;
    expect(voiceMonthlyMinutes()).toBe(12);
    process.env.VOICE_MONTHLY_MINUTES = "300";
    expect(voiceMonthlyMinutes()).toBe(300);
    process.env.VOICE_MONTHLY_MINUTES = "abc";
    expect(voiceMonthlyMinutes()).toBe(12);
  });
  it("month starts on the 1st at 00:00 UTC", () => {
    expect(monthStartIso(new Date("2026-10-17T13:45:00Z"))).toBe("2026-10-01T00:00:00.000Z");
  });
  it("is off unless both keys are set", () => {
    delete process.env.ELEVENLABS_API_KEY; delete process.env.ELEVENLABS_AGENT_ID;
    expect(voiceEnabled()).toBe(false);
    process.env.ELEVENLABS_API_KEY = "x";
    expect(voiceEnabled()).toBe(false);
    process.env.ELEVENLABS_AGENT_ID = "y";
    expect(voiceEnabled()).toBe(true);
  });
});
