import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { hashToken, isTokenExpired } from "@/lib/token";

const schema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
  endpoint: z.string().url().max(2048),
  p256dh: z.string().max(512),
  auth: z.string().max(256),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { token, endpoint, p256dh, auth } = parsed.data;
  const supabase = createServiceClient();

  const { data: tokenRow } = await supabase
    .from("stay_tokens")
    .select("booking_id, revoked_at, bookings(check_out)")
    .eq("token_hash", hashToken(token))
    .single<{ booking_id: string; revoked_at: string | null; bookings: { check_out: string } }>();

  if (!tokenRow || tokenRow.revoked_at) return NextResponse.json({ error: "invalid_token" }, { status: 403 });

  const booking = Array.isArray(tokenRow.bookings) ? tokenRow.bookings[0] : tokenRow.bookings;
  if (!booking || isTokenExpired(booking.check_out)) return NextResponse.json({ error: "expired" }, { status: 410 });

  await supabase.from("push_subscriptions").upsert(
    { booking_id: tokenRow.booking_id, endpoint, p256dh, auth },
    { onConflict: "booking_id,endpoint" },
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  const endpoint = searchParams.get("endpoint") ?? "";
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: tokenRow } = await supabase
    .from("stay_tokens")
    .select("booking_id")
    .eq("token_hash", hashToken(token))
    .single<{ booking_id: string }>();

  if (tokenRow) {
    await supabase.from("push_subscriptions")
      .delete()
      .eq("booking_id", tokenRow.booking_id)
      .eq("endpoint", endpoint);
  }

  return NextResponse.json({ ok: true });
}
