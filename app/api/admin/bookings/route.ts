import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateToken, hashToken } from "@/lib/token";
import { encrypt } from "@/lib/crypto";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  propertyId: z.string().uuid(),
  guestFirstName: z.string().min(1).max(100),
  guestLastName: z.string().min(1).max(100),
  guestEmail: z.string().email().nullish(),
  guestPhone: z.string().max(30).nullish(),
  guestLang: z.enum(["en", "ar"]),
  guestCount: z.number().int().min(1).max(50),
  checkIn: z.string().datetime({ local: true }),
  checkOut: z.string().datetime({ local: true }),
  doorCode: z.string().max(20).nullish(),
  source: z.enum(["airbnb", "booking", "direct", "other"]),
  externalRef: z.string().max(100).nullish(),
});

export async function POST(req: NextRequest) {
  // TODO Phase 3: add admin JWT auth check here
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const supabase = createServiceClient();

  // Validate property exists
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", d.propertyId)
    .single<{ id: string }>();

  if (!property) {
    return NextResponse.json({ error: "property_not_found" }, { status: 404 });
  }

  // Check for overlapping bookings on the same property (exclude cancelled)
  const checkInIso = new Date(d.checkIn).toISOString();
  const checkOutIso = new Date(d.checkOut).toISOString();

  const { data: overlaps } = await supabase
    .from("bookings")
    .select("id, guest_first_name, guest_last_name, check_in, check_out, status")
    .eq("property_id", d.propertyId)
    .in("status", ["confirmed", "completed"])
    .lt("check_in", checkOutIso)
    .gt("check_out", checkInIso)
    .limit(1)
    .returns<{ id: string; guest_first_name: string; guest_last_name: string; check_in: string; check_out: string; status: string }[]>();

  if (overlaps && overlaps.length > 0) {
    const clash = overlaps[0];
    return NextResponse.json(
      {
        error: "date_conflict",
        message: `Dates overlap with a ${clash.status} booking for ${clash.guest_first_name} ${clash.guest_last_name} (${clash.check_in.slice(0, 10)} → ${clash.check_out.slice(0, 10)})`,
      },
      { status: 409 }
    );
  }

  // Encrypt sensitive fields
  const doorCodeEncrypted = d.doorCode ? encrypt(d.doorCode) : null;
  const guestPhoneEncrypted = d.guestPhone ? encrypt(d.guestPhone) : null;

  // Create booking
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      property_id: d.propertyId,
      external_ref: d.externalRef ?? null,
      source: d.source,
      guest_first_name: d.guestFirstName,
      guest_last_name: d.guestLastName,
      guest_phone: guestPhoneEncrypted,
      guest_email: d.guestEmail ?? null,
      guest_lang: d.guestLang,
      guest_count: d.guestCount,
      check_in: new Date(d.checkIn).toISOString(),
      check_out: new Date(d.checkOut).toISOString(),
      door_code_encrypted: doorCodeEncrypted,
      status: "confirmed",
    })
    .select("id")
    .single<{ id: string }>();

  if (bookingErr || !booking) {
    console.error(bookingErr);
    return NextResponse.json({ error: "booking_creation_failed" }, { status: 500 });
  }

  // Generate token
  const plaintext = generateToken();
  const hash = hashToken(plaintext);
  const checkOut = new Date(d.checkOut);
  const expiresAt = new Date(checkOut.getTime() + 24 * 60 * 60 * 1000);

  const { error: tokenErr } = await supabase.from("stay_tokens").insert({
    booking_id: booking.id,
    token_hash: hash,
    issued_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  if (tokenErr) {
    console.error(tokenErr);
    return NextResponse.json({ error: "token_creation_failed" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${appUrl}/s/${plaintext}`;

  await supabase.from("audit_log").insert({
    actor_type: "admin",
    actor_id: null,
    action: "booking_created",
    entity: "bookings",
    entity_id: booking.id,
    meta: { source: d.source },
  });

  return NextResponse.json({ bookingId: booking.id, link });
}
