import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { hashToken, isTokenExpired } from "@/lib/token";

const schema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { token, stars, comment } = parsed.data;
  const supabase = createServiceClient();

  const { data: tokenRow } = await supabase
    .from("stay_tokens")
    .select("booking_id, revoked_at, bookings(check_out)")
    .eq("token_hash", hashToken(token))
    .single<{ booking_id: string; revoked_at: string | null; bookings: { check_out: string } }>();

  if (!tokenRow || tokenRow.revoked_at) return NextResponse.json({ error: "invalid_token" }, { status: 403 });

  const booking = Array.isArray(tokenRow.bookings) ? tokenRow.bookings[0] : tokenRow.bookings;
  if (!booking || isTokenExpired(booking.check_out)) return NextResponse.json({ error: "expired" }, { status: 410 });

  await supabase.from("stay_ratings").upsert(
    { booking_id: tokenRow.booking_id, stars, comment: comment ?? null },
    { onConflict: "booking_id" },
  );

  return NextResponse.json({ ok: true });
}
