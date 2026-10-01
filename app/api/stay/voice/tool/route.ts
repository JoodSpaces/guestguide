import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBookingFromToken } from "@/lib/guest-auth";
import { isTokenExpired } from "@/lib/token";
import { allow } from "@/lib/rate-limit";
import { voiceEnabled } from "@/lib/voice";
import { isVoiceReadTool, runVoiceReadTool } from "@/lib/voice-tools";

const schema = z.object({
  token: z.string(),
  tool: z.string(),
  locale: z.enum(["en", "ar"]).default("en"),
  args: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Read-only lookups for the voice agent (services, request status, nearby, the stay, house-guide search). The browser calls this
 * with the guest's own link when the agent asks for a tool; the result is plain text for the agent to speak.
 */
export async function POST(req: NextRequest) {
  if (!voiceEnabled()) return NextResponse.json({ error: "voice_off" }, { status: 503 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isVoiceReadTool(parsed.data.tool)) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const booking = await getBookingFromToken(parsed.data.token);
  if (!booking) return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  if (isTokenExpired(booking.check_out)) return NextResponse.json({ error: "expired" }, { status: 404 });
  if (!(await allow({ name: "voice-tool", limit: 120, windowSec: 3600 }, booking.id))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  try {
    const result = await runVoiceReadTool(booking, parsed.data.tool, parsed.data.args, parsed.data.locale);
    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
