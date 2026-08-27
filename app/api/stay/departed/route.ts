import { NextRequest, NextResponse } from "next/server";
import { hashToken } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token: string | undefined = body?.token;
  if (!token || token.length !== 22) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: tokenRow } = await supabase
    .from("stay_tokens")
    .select("booking_id")
    .eq("token_hash", hashToken(token))
    .single<{ booking_id: string }>();

  if (!tokenRow) return NextResponse.json({ ok: true }); // silent, non-critical

  await supabase.from("audit_log").insert({
    actor_type: "guest",
    actor_id: null,
    action: "guest_departed",
    entity: "bookings",
    entity_id: tokenRow.booking_id,
    meta: {},
  });

  // TODO Phase 3: trigger WhatsApp notification to team for turnover
  return NextResponse.json({ ok: true });
}
