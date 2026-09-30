/** The voice concierge needs both values; without them the screen falls back exactly as before. */
export const voiceEnabled = (): boolean =>
  !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID);

/** Minutes of voice the whole site may use per calendar month (set VOICE_MONTHLY_MINUTES; the free ElevenLabs plan is ~15). */
export const voiceMonthlyMinutes = (): number => {
  const n = Number(process.env.VOICE_MONTHLY_MINUTES);
  return Number.isFinite(n) && n > 0 ? n : 12;
};

export function monthStartIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
