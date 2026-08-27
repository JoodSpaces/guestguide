import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { hashToken, isTokenExpired } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";
import { StayShell } from "@/components/stay/StayShell";
import { CheckoutClient } from "@/components/stay/CheckoutClient";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function CheckoutPage({ params }: Props) {
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
    .select(`id, check_out, properties(name, name_ar, checkout_time, on_call_phone)`)
    .eq("id", tokenRow.booking_id)
    .single<{
      id: string;
      check_out: string;
      properties: {
        name: string;
        name_ar: string;
        checkout_time: string;
        on_call_phone: string;
      };
    }>();

  if (!booking) notFound();
  if (isTokenExpired(booking.check_out)) notFound();

  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties;

  const checkoutTime = property?.checkout_time ?? "11:00";
  const checkoutDate = new Date(booking.check_out);

  const formatted = new Intl.DateTimeFormat(isAr ? "ar-EG" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(checkoutDate);

  return (
    <StayShell
      token={token}
      back
      title={isAr ? property?.name_ar : property?.name}
    >
      <CheckoutClient
        bookingId={booking.id}
        token={token}
        checkoutDate={formatted}
        checkoutTime={checkoutTime}
        onCallPhone={property?.on_call_phone ?? null}
        locale={locale}
      />
    </StayShell>
  );
}
