import Anthropic from "@anthropic-ai/sdk";
import { aiEnabled } from "@/lib/ai";
import { voiceEnabled } from "@/lib/voice";

/**
 * A real health test of the AI, not "is a key set". Once an hour (cached) it makes the smallest possible call to each provider
 * and records whether it worked and how long it took. The Control Tower reads the result through the signed snapshot.
 * Cost: one 5-token reply plus one signed-URL request per hour.
 */
export interface ProbeResult { ok: boolean; ms: number; error?: string }
export interface AiProbe { text: ProbeResult | null; voice: ProbeResult | null; checked_at: string }

const TTL_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 8000;
let cache: { at: number; value: AiProbe } | null = null;

async function timed(fn: () => Promise<void>): Promise<ProbeResult> {
  const t = Date.now();
  try { await fn(); return { ok: true, ms: Date.now() - t }; }
  catch (e) { return { ok: false, ms: Date.now() - t, error: (e instanceof Error ? e.message : String(e)).replace(/sk-[A-Za-z0-9_-]+/g, "[key]").slice(0, 120) }; }
}

export async function probeText(): Promise<ProbeResult | null> {
  if (!aiEnabled()) return null;
  return timed(async () => {
    const res = await new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 }).messages.create({ model: "claude-haiku-4-5-20251001", max_tokens: 5, messages: [{ role: "user", content: "Reply with the word ok." }] });
    if (!res.content?.length) throw new Error("empty reply");
  });
}

export async function probeVoice(): Promise<ProbeResult | null> {
  if (!voiceEnabled()) return null;
  return timed(async () => {
    const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(process.env.ELEVENLABS_AGENT_ID!)}`,
      { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!r.ok) throw new Error(`voice provider answered ${r.status}`);
    const j = (await r.json()) as { signed_url?: string };
    if (!j.signed_url) throw new Error("no session URL returned");
  });
}

export async function getAiProbe(now = Date.now()): Promise<AiProbe> {
  if (cache && now - cache.at < TTL_MS) return cache.value;
  const [text, voice] = await Promise.all([probeText(), probeVoice()]);
  const value = { text, voice, checked_at: new Date(now).toISOString() };
  cache = { at: now, value };
  return value;
}

export function _resetProbeCache() { cache = null; }
