import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { getBookingFromToken } from "@/lib/guest-auth";

const schema = z.object({
  token: z.string(),
  sessionId: z.string().uuid(),
  durationSec: z.number().int().min(0).max(3600),
  transcript: z.array(z.object({ role: z.enum(["guest", "agent"]), text: z.string().max(1500) })).max(200),
  unanswered: z.array(z.string().max(300)).max(20).default([]),
  actions: z.array(z.string().max(120)).max(20).default([]),
});

/** Saves how a conversation went. Sent when the call ends (also via sendBeacon when the tab closes). */
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });
  const booking = await getBookingFromToken(parsed.data.token);
  if (!booking) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("voice_sessions")
    .update({
      ended_at: new Date().toISOString(),
      duration_sec: parsed.data.durationSec,
      transcript: parsed.data.transcript,
      unanswered: parsed.data.unanswered,
      actions: parsed.data.actions,
    })
    .eq("id", parsed.data.sessionId)
    .eq("booking_id", booking.id);
  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
