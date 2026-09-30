import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getBookingFromToken } from "@/lib/guest-auth";
import { isTokenExpired } from "@/lib/token";
import { allow } from "@/lib/rate-limit";
import { voiceEnabled, voiceMonthlyMinutes, monthStartIso } from "@/lib/voice";
import { buildVoiceContext } from "@/lib/stay-context";

/**
 * Starts a voice conversation for a guest with a live stay link. Returns a signed, short-lived ElevenLabs session URL (the API
 * key never leaves the server), the private context the agent needs about this guest and house, and a session id for the log.
 * Guards: a handful of conversations per booking per day, and a site-wide monthly minutes cap so the free plan cannot be drained.
 */
export async function POST(req: NextRequest) {
  if (!voiceEnabled()) return NextResponse.json({ error: "voice_off" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const token: string | undefined = body?.token;
  const locale: "en" | "ar" = body?.locale === "ar" ? "ar" : "en";
  if (!token || typeof token !== "string") return NextResponse.json({ error: "invalid_token" }, { status: 400 });

  const booking = await getBookingFromToken(token);
  if (!booking) return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  if (isTokenExpired(booking.check_out)) return NextResponse.json({ error: "expired" }, { status: 404 });

  if (!(await allow({ name: "voice-session", limit: 15, windowSec: 24 * 3600 }, booking.id))) {
    return NextResponse.json({ error: "daily_limit" }, { status: 429 });
  }

  const supabase = createServiceClient();
  // Monthly budget. If the table is not there yet (migration 032 not run) the cap simply cannot be measured.
  const { data: used, error: usedErr } = await supabase.from("voice_sessions").select("duration_sec").gte("started_at", monthStartIso());
  if (!usedErr) {
    const seconds = (used ?? []).reduce((n, r) => n + (r.duration_sec ?? 0), 0);
    if (seconds / 60 >= voiceMonthlyMinutes()) return NextResponse.json({ error: "budget" }, { status: 429 });
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(process.env.ELEVENLABS_AGENT_ID!)}`,
    { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! }, cache: "no-store" },
  );
  if (!res.ok) return NextResponse.json({ error: "provider" }, { status: 502 });
  const { signed_url } = (await res.json()) as { signed_url?: string };
  if (!signed_url) return NextResponse.json({ error: "provider" }, { status: 502 });

  const [{ text }, session] = await Promise.all([
    buildVoiceContext(booking, locale),
    supabase.from("voice_sessions").insert({ booking_id: booking.id, locale }).select("id").single<{ id: string }>(),
  ]);

  return NextResponse.json({ signedUrl: signed_url, context: text, sessionId: session.data?.id ?? null });
}
