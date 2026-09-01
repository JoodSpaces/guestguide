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

  const [{ data: booking }, { data: serviceRequests }] = await Promise.all([
    supabase
      .from("bookings")
      .select(`id, property_id, guest_first_name, guest_lang, check_in, check_out,
               properties (name, name_ar, tonight_note, tonight_note_ar)`)
      .eq("id", tokenRow.booking_id)
      .single<{
        id: string;
        property_id: string;
        guest_first_name: string;
        guest_lang: "en" | "ar";
        check_in: string;
        check_out: string;
        properties: { name: string; name_ar: string; tonight_note: string | null; tonight_note_ar: string | null } | { name: string; name_ar: string; tonight_note: string | null; tonight_note_ar: string | null }[];
      }>(),
    supabase
      .from("service_requests")
      .select("id, status, paymob_payment_url, services(name_en)")
      .eq("booking_id", tokenRow.booking_id)
      .neq("status", "rejected")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!booking) notFound();

  await supabase.rpc("record_token_open", { p_token_id: tokenRow.id });

  // Fetch hero image separately — column added in migration 011; null if not yet migrated
  let heroImageUrl: string | null = null;
  const { data: heroProp } = await supabase
    .from("properties")
    .select("hero_image_url")
    .eq("id", booking.property_id)
    .maybeSingle<{ hero_image_url: string | null }>();
  if (heroProp && "hero_image_url" in heroProp) heroImageUrl = heroProp.hero_image_url;

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

  const requests = (serviceRequests ?? []) as unknown as Array<{
    id: string;
    status: string;
    paymob_payment_url: string | null;
    services: { name_en: string } | null;
  }>;

  const payNowRequest = requests.find(
    (r) => r.status === "approved" && r.paymob_payment_url
  );

  const requestSummary =
    requests.length > 0
      ? {
          count: requests.length,
          payNow: payNowRequest
            ? {
                url: payNowRequest.paymob_payment_url!,
                serviceName: (payNowRequest.services as { name_en: string } | null)?.name_en ?? "Service",
              }
            : null,
        }
      : null;

  return (
    <StayHome
      payload={payload}
      token={token}
      requestSummary={requestSummary}
      tonightNote={property?.tonight_note ?? null}
      tonightNoteAr={property?.tonight_note_ar ?? null}
      heroImageUrl={heroImageUrl}
    />
  );
}
