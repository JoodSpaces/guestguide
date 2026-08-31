import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { hashToken, isTokenExpired, computePhase } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";
import { StayShell } from "@/components/stay/StayShell";
import { ConciergeClient } from "@/components/stay/ConciergeClient";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ConciergePage({ params }: Props) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) notFound();

  const locale = await getLocale();
  const isAr = locale === "ar";
  const supabase = createServiceClient();

  const { data: tokenRow } = await supabase
    .from("stay_tokens")
    .select("booking_id, revoked_at")
    .eq("token_hash", hashToken(token))
    .single<{ booking_id: string; revoked_at: string | null }>();

  if (!tokenRow || tokenRow.revoked_at) notFound();

  const { data: booking } = await supabase
    .from("bookings")
    .select("check_in, check_out, guest_first_name, property_id, properties(name, name_ar)")
    .eq("id", tokenRow.booking_id)
    .single<{
      check_in: string;
      check_out: string;
      guest_first_name: string;
      property_id: string;
      properties: { name: string; name_ar: string };
    }>();

  if (!booking) notFound();
  if (isTokenExpired(booking.check_out)) notFound();

  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties;

  const phase = computePhase(booking.check_in, booking.check_out);
  const propertyName = isAr ? property?.name_ar : property?.name;

  return (
    <StayShell token={token} back title={isAr ? "كونسيرج جود" : "JOOD Concierge"}>
      <ConciergeClient
        token={token}
        locale={locale}
        phase={phase}
        guestFirstName={booking.guest_first_name}
        propertyName={propertyName ?? ""}
      />
    </StayShell>
  );
}
