import { notFound, redirect } from "next/navigation";
import { hashToken, isTokenExpired, computePhase } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";
import { StayShell } from "@/components/stay/StayShell";
import { MemoryCard } from "@/components/stay/MemoryCard";

interface Props { params: Promise<{ token: string }> }

export default async function MemoryPage({ params }: Props) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) notFound();

  const hash = hashToken(token);
  const supabase = createServiceClient();

  const { data: tokenRow } = await supabase
    .from("stay_tokens")
    .select("booking_id, revoked_at, bookings(guest_first_name, guest_lang, check_in, check_out, properties(name, name_ar))")
    .eq("token_hash", hash)
    .single<{
      booking_id: string;
      revoked_at: string | null;
      bookings: {
        guest_first_name: string;
        guest_lang: string;
        check_in: string;
        check_out: string;
        properties: { name: string; name_ar: string } | { name: string; name_ar: string }[];
      };
    }>();

  if (!tokenRow || tokenRow.revoked_at) notFound();

  const booking = tokenRow.bookings;
  if (isTokenExpired(booking.check_out)) redirect(`/s/${token}/expired`);

  const phase = computePhase(booking.check_in, booking.check_out);
  const property = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties;
  const locale = booking.guest_lang === "ar" ? "ar" : "en";

  const checkIn = new Date(booking.check_in);
  const checkOut = new Date(booking.check_out);
  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  const fmt = (d: Date) => d.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <StayShell token={token} title={locale === "ar" ? "ذكرى إقامتك" : "Your stay"} back>
      <MemoryCard
        guestFirstName={booking.guest_first_name}
        propertyName={locale === "ar" ? (property?.name_ar ?? property?.name ?? "") : (property?.name ?? "")}
        checkIn={fmt(checkIn)}
        checkOut={fmt(checkOut)}
        nights={nights}
        phase={phase}
        locale={locale}
        token={token}
      />
    </StayShell>
  );
}
