import { NextRequest, NextResponse } from "next/server";
import { hashToken, isArrivalUnlocked } from "@/lib/token";
import { decrypt } from "@/lib/crypto";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token: string | undefined = body?.token;
  const secondFactor: string | undefined = body?.secondFactor;

  if (!token || typeof token !== "string" || token.length !== 22) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const hash = hashToken(token);
  const supabase = createServiceClient();

  const { data: tokenRow } = await supabase
    .from("stay_tokens")
    .select("booking_id, revoked_at")
    .eq("token_hash", hash)
    .single<{ booking_id: string; revoked_at: string | null }>();

  if (!tokenRow || tokenRow.revoked_at) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("check_in, check_out, door_code_encrypted, guest_phone, properties(requires_code_second_factor)")
    .eq("id", tokenRow.booking_id)
    .single<{
      check_in: string;
      check_out: string;
      door_code_encrypted: string | null;
      guest_phone: string | null;
      properties: { requires_code_second_factor: boolean } | { requires_code_second_factor: boolean }[];
    }>();

  if (!booking) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  // Hard security gate — checked server-side, code never leaves before this
  if (!isArrivalUnlocked(booking.check_in)) {
    await supabase.from("audit_log").insert({
      actor_type: "guest",
      actor_id: null,
      action: "door_code_early_attempt",
      entity: "bookings",
      entity_id: tokenRow.booking_id,
      meta: {},
    });
    return NextResponse.json({ error: "arrival_locked" }, { status: 403 });
  }

  // Check that token hasn't expired
  const now = Date.now();
  if (now > new Date(booking.check_out).getTime() + 48 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "token_expired" }, { status: 403 });
  }

  if (!booking.door_code_encrypted) {
    return NextResponse.json({ error: "code_not_set" }, { status: 404 });
  }

  // Second-factor check (per-unit setting)
  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties;

  if (property?.requires_code_second_factor) {
    if (!secondFactor || typeof secondFactor !== "string") {
      return NextResponse.json({ error: "second_factor_required" }, { status: 403 });
    }
    const phone = booking.guest_phone ? decrypt(booking.guest_phone) : "";
    const last4 = phone.replace(/\D/g, "").slice(-4);
    if (!last4 || secondFactor.trim() !== last4) {
      await supabase.from("audit_log").insert({
        actor_type: "guest",
        actor_id: null,
        action: "door_code_second_factor_failed",
        entity: "bookings",
        entity_id: tokenRow.booking_id,
        meta: {},
      });
      return NextResponse.json({ error: "second_factor_invalid" }, { status: 403 });
    }
  }

  const code = decrypt(booking.door_code_encrypted);

  await supabase.from("audit_log").insert({
    actor_type: "guest",
    actor_id: null,
    action: "door_code_revealed",
    entity: "bookings",
    entity_id: tokenRow.booking_id,
    meta: {},
  });

  return NextResponse.json({ code });
}
