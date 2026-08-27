import { NextRequest, NextResponse } from "next/server";
import { hashToken, computePhase, isArrivalUnlocked, isTokenExpired } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";
import type { TokenPayload } from "@/lib/token";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token: string | undefined = body?.token;

  if (!token || typeof token !== "string" || token.length !== 22) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const hash = hashToken(token);
  const supabase = createServiceClient();

  const { data: tokenRow, error: tokenErr } = await supabase
    .from("stay_tokens")
    .select("id, booking_id, revoked_at")
    .eq("token_hash", hash)
    .single<{ id: string; booking_id: string; revoked_at: string | null }>();

  if (tokenErr || !tokenRow) {
    await supabase.from("audit_log").insert({
      actor_type: "guest",
      actor_id: null,
      action: "token_resolve_failed",
      entity: "stay_tokens",
      entity_id: "unknown",
      meta: { hash_prefix: hash.slice(0, 8) },
    });
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  if (tokenRow.revoked_at) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .select(`id, property_id, guest_first_name, guest_lang, check_in, check_out,
             properties (name, name_ar)`)
    .eq("id", tokenRow.booking_id)
    .single<{
      id: string;
      property_id: string;
      guest_first_name: string;
      guest_lang: "en" | "ar";
      check_in: string;
      check_out: string;
      properties: { name: string; name_ar: string } | { name: string; name_ar: string }[];
    }>();

  if (bookingErr || !booking) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  await supabase.rpc("record_token_open", { p_token_id: tokenRow.id });

  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties;

  const expired = isTokenExpired(booking.check_out);
  const phase = computePhase(booking.check_in, booking.check_out);
  const arrivalUnlocked = isArrivalUnlocked(booking.check_in);

  const payload: TokenPayload = {
    bookingId: booking.id,
    propertyId: booking.property_id,
    propertyName: property?.name ?? "",
    propertyNameAr: property?.name_ar ?? "",
    guestFirstName: booking.guest_first_name,
    guestLang: booking.guest_lang,
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    phase,
    arrivalUnlocked,
    isExpired: expired,
  };

  return NextResponse.json(payload);
}
