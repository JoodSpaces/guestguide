import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { hashToken, doorCodeWindow } from "@/lib/token";
import { decrypt } from "@/lib/crypto";
import { createServiceClient } from "@/lib/supabase/server";

// The second factor is the last 4 digits of the guest's phone: 10,000 values.
// Rate limiting by IP is not enough (and needs Redis), so cap wrong guesses per
// booking in the database, where every failure is already audited.
const MAX_SECOND_FACTOR_FAILURES = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

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
    .select("status, check_in, check_out, door_code_encrypted, guest_phone, properties(requires_code_second_factor)")
    .eq("id", tokenRow.booking_id)
    .single<{
      status: string;
      check_in: string;
      check_out: string;
      door_code_encrypted: string | null;
      guest_phone: string | null;
      properties: { requires_code_second_factor: boolean } | { requires_code_second_factor: boolean }[];
    }>();

  // A cancelled booking looks exactly like an unknown link.
  if (!booking || booking.status === "cancelled") {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  // Hard security gate — checked server-side, the code never leaves before this
  const window = doorCodeWindow(booking.check_in, booking.check_out);
  if (window === "locked") {
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
  if (window === "closed") {
    return NextResponse.json({ error: "door_code_expired" }, { status: 403 });
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

    const since = new Date(Date.now() - FAILURE_WINDOW_MS).toISOString();
    const { count: recentFailures } = await supabase
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("action", "door_code_second_factor_failed")
      .eq("entity_id", tokenRow.booking_id)
      .gte("created_at", since);
    if ((recentFailures ?? 0) >= MAX_SECOND_FACTOR_FAILURES) {
      return NextResponse.json({ error: "too_many_attempts" }, { status: 429, headers: { "Retry-After": "900" } });
    }

    let phone = "";
    try {
      phone = booking.guest_phone ? decrypt(booking.guest_phone) : "";
    } catch {
      phone = "";
    }
    const last4 = phone.replace(/\D/g, "").slice(-4);
    if (!last4 || !safeEqual(secondFactor.trim(), last4)) {
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
