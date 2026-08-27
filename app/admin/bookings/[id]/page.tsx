import { notFound } from "next/navigation";
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

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, guest_first_name, guest_last_name, guest_email, guest_phone, guest_lang, guest_count, check_in, check_out, status, source, external_ref, door_code_encrypted, created_at, property_id, properties(id, name, name_ar)"
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
      properties: { id: string; name: string; name_ar: string } | { id: string; name: string; name_ar: string }[];
    }>();

  if (!booking) notFound();

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
      }}
      property={property ?? null}
      tokens={tokens ?? []}
    />
  );
}
