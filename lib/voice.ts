/** The voice concierge needs both values; without them the screen falls back exactly as before. */
export const voiceEnabled = (): boolean =>
  !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID);
