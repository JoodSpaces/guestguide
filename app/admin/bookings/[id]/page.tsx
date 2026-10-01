import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { scopeFromHeaders } from "@/lib/admin-scope";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { BookingDetailClient } from "@/components/admin/BookingDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = createServiceClient();

  const [{ data: booking }, { data: arrivalPrefs }] = await Promise.all([
   supabase
    .from("bookings")
    .select(
      "id, guest_first_name, guest_last_name, guest_email, guest_phone, guest_lang, guest_count, check_in, check_out, status, source, external_ref, door_code_encrypted, created_at, property_id, dnd_active, voice_limit, properties(id, name, name_ar)"
    )
    .eq("id", id)
    .single<{
      id: string;
      guest_first_name: string;
      guest_last_name: string;
      guest_email: string | null;
      guest_phone: string | null;
      guest_lang: string;
      guest_count: number;
      check_in: string;
      check_out: string;
      status: "confirmed" | "cancelled" | "completed";
      source: string;
      external_ref: string | null;
      door_code_encrypted: string | null;
      created_at: string;
      property_id: string;
      dnd_active: boolean;
      voice_limit: number | null;
      properties: { id: string; name: string; name_ar: string } | { id: string; name: string; name_ar: string }[];
    }>(),
   supabase
    .from("arrival_preferences")
    .select("occasion, temp_pref, notes, submitted_at")
    .eq("booking_id", id)
    .maybeSingle<{ occasion: string | null; temp_pref: string | null; notes: string | null; submitted_at: string }>(),
  ]);

  if (!booking) notFound();
  // A scoped member must not open another property's booking (guest phone, door code).
  const scope = scopeFromHeaders(await headers());
  if (scope && !scope.includes(booking.property_id)) notFound();

  const { data: rating } = await supabase
    .from("stay_ratings")
    .select("stars, comment, created_at")
    .eq("booking_id", id)
    .single<{ stars: number; comment: string | null; created_at: string }>();

  const { data: tokens } = await supabase
    .from("stay_tokens")
    .select("id, open_count, first_opened_at, last_opened_at, revoked_at, expires_at")
    .eq("booking_id", id)
    .order("issued_at", { ascending: false })
    .returns<{ id: string; open_count: number; first_opened_at: string | null; last_opened_at: string | null; revoked_at: string | null; expires_at: string }[]>();

  let doorCode: string | null = null;
  if (booking.door_code_encrypted) {
    try { doorCode = decrypt(booking.door_code_encrypted); } catch { /* encrypted with a different key */ }
  }

  let guestPhone: string | null = null;
  if (booking.guest_phone) {
    try { guestPhone = decrypt(booking.guest_phone); } catch { guestPhone = booking.guest_phone; }
  }

  // Table may not exist yet (migration 032): then nothing has been used.
  const { count: voiceUsed } = await supabase.from("voice_sessions").select("id", { count: "exact", head: true }).eq("booking_id", id);

  const property = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties;

  return (
    <BookingDetailClient
      booking={{
        id: booking.id,
        guestFirstName: booking.guest_first_name,
        guestLastName: booking.guest_last_name,
        guestEmail: booking.guest_email,
        guestPhone,
        guestLang: booking.guest_lang,
        guestCount: booking.guest_count,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        status: booking.status,
        source: booking.source,
        externalRef: booking.external_ref,
        doorCode,
        createdAt: booking.created_at,
        propertyId: booking.property_id,
        dndActive: booking.dnd_active,
        voiceLimit: booking.voice_limit,
        voiceUsed: voiceUsed ?? 0,
      }}
      property={property ?? null}
      tokens={tokens ?? []}
      rating={rating ?? null}
      arrivalPrefs={arrivalPrefs ?? null}
    />
  );
}
