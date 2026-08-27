import { notFound, redirect } from "next/navigation";
import { hashToken, computePhase, isArrivalUnlocked, isTokenExpired } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";
import { StayHome } from "@/components/stay/StayHome";
import type { TokenPayload } from "@/lib/token";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function StayPage({ params }: Props) {
  const { token } = await params;

  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) notFound();

  const hash = hashToken(token);
  const supabase = createServiceClient();

  const { data: tokenRow } = await supabase
    .from("stay_tokens")
    .select("id, booking_id, revoked_at")
    .eq("token_hash", hash)
    .single<{ id: string; booking_id: string; revoked_at: string | null }>();

  if (!tokenRow || tokenRow.revoked_at) notFound();

  const { data: booking } = await supabase
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

  if (!booking) notFound();

  await supabase.rpc("record_token_open", { p_token_id: tokenRow.id });

  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties;

  if (isTokenExpired(booking.check_out)) {
    redirect(`/s/${token}/expired`);
  }

  const payload: TokenPayload = {
    bookingId: booking.id,
    propertyId: booking.property_id,
    propertyName: property?.name ?? "",
    propertyNameAr: property?.name_ar ?? "",
    guestFirstName: booking.guest_first_name,
    guestLang: booking.guest_lang,
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    phase: computePhase(booking.check_in, booking.check_out),
    arrivalUnlocked: isArrivalUnlocked(booking.check_in),
    isExpired: false,
  };

  return <StayHome payload={payload} token={token} />;
}
