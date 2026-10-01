import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBookingFromToken } from "@/lib/guest-auth";
import { isTokenExpired } from "@/lib/token";
import { allow } from "@/lib/rate-limit";
import { voiceEnabled } from "@/lib/voice";
import { checkLateCheckout, isEmergencyKind, raiseEmergency } from "@/lib/voice-actions";

const schema = z.discriminatedUnion("action", [
  z.object({ token: z.string(), action: z.literal("check_late_checkout"), until: z.string().max(40) }),
  z.object({ token: z.string(), action: z.literal("report_emergency"), kind: z.string().max(20), details: z.string().max(800).default("") }),
]);

/** Actions for the voice agent that go beyond a lookup: judging a late check-out against the calendar, and raising an emergency. */
export async function POST(req: NextRequest) {
  if (!voiceEnabled()) return NextResponse.json({ error: "voice_off" }, { status: 503 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });
  const d = parsed.data;

  const booking = await getBookingFromToken(d.token);
  if (!booking) return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  if (isTokenExpired(booking.check_out)) return NextResponse.json({ error: "expired" }, { status: 404 });

  try {
    if (d.action === "report_emergency") {
      if (!isEmergencyKind(d.kind)) return NextResponse.json({ error: "validation_error" }, { status: 400 });
      if (!(await allow({ name: "voice-emergency", limit: 6, windowSec: 3600 }, booking.id))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      const r = await raiseEmergency(booking, d.kind, d.details);
      return NextResponse.json({ result: r.text, onCallPhone: r.onCallPhone, ok: r.ok });
    }
    if (!(await allow({ name: "voice-latecheckout", limit: 20, windowSec: 3600 }, booking.id))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    return NextResponse.json({ result: await checkLateCheckout(booking, d.until) });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
