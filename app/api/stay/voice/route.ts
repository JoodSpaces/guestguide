import { NextRequest, NextResponse } from "next/server";
import { hashToken, isTokenExpired } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";
import { allow } from "@/lib/rate-limit";
import { voiceEnabled } from "@/lib/voice";

/**
 * Hands a signed, short-lived ElevenLabs session URL to a guest with a live stay link. The API key never leaves the server, and
 * a booking can only start a handful of conversations a day so one link cannot drain the monthly minutes.
 */
export async function POST(req: NextRequest) {
  if (!voiceEnabled()) return NextResponse.json({ error: "voice_off" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const token: string | undefined = body?.token;
  if (!token || typeof token !== "string" || !/^[A-Za-z0-9_-]{22}$/.test(token)) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: tokenRow } = await supabase
    .from("stay_tokens")
    .select("booking_id, revoked_at")
    .eq("token_hash", hashToken(token))
    .single<{ booking_id: string; revoked_at: string | null }>();
  if (!tokenRow || tokenRow.revoked_at) return NextResponse.json({ error: "invalid_token" }, { status: 404 });

  const { data: booking } = await supabase
    .from("bookings")
    .select("check_out, guest_first_name, properties(name)")
    .eq("id", tokenRow.booking_id)
    .single<{ check_out: string; guest_first_name: string; properties: { name: string } | { name: string }[] | null }>();
  if (!booking || isTokenExpired(booking.check_out)) return NextResponse.json({ error: "expired" }, { status: 404 });

  if (!(await allow({ name: "voice-session", limit: 15, windowSec: 24 * 3600 }, tokenRow.booking_id))) {
    return NextResponse.json({ error: "daily_limit" }, { status: 429 });
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(process.env.ELEVENLABS_AGENT_ID!)}`,
    { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! }, cache: "no-store" },
  );
  if (!res.ok) return NextResponse.json({ error: "provider" }, { status: 502 });
  const { signed_url } = (await res.json()) as { signed_url?: string };
  if (!signed_url) return NextResponse.json({ error: "provider" }, { status: 502 });

  const property = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties;
  return NextResponse.json({ signedUrl: signed_url, guestName: booking.guest_first_name, propertyName: property?.name ?? "" });
}
