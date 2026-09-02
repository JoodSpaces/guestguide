import { notFound, redirect } from "next/navigation";
import { hashToken, isTokenExpired } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";
import { StayShell } from "@/components/stay/StayShell";
import { CustomizeForm } from "@/components/stay/CustomizeForm";

interface Props { params: Promise<{ token: string }> }

export default async function CustomizePage({ params }: Props) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) notFound();

  const hash = hashToken(token);
  const supabase = createServiceClient();

  const { data: tokenRow } = await supabase
    .from("stay_tokens")
    .select("booking_id, revoked_at, bookings(guest_lang, check_out)")
    .eq("token_hash", hash)
    .single<{ booking_id: string; revoked_at: string | null; bookings: { guest_lang: string; check_out: string } }>();

  if (!tokenRow || tokenRow.revoked_at) notFound();
  const booking = tokenRow.bookings;
  if (isTokenExpired(booking.check_out)) redirect(`/s/${token}/expired`);

  // Load any existing preferences
  const { data: prefs } = await supabase
    .from("arrival_preferences")
    .select("occasion, temp_pref, notes")
    .eq("booking_id", tokenRow.booking_id)
    .maybeSingle<{ occasion: string | null; temp_pref: string | null; notes: string | null }>();

  const locale = booking.guest_lang === "ar" ? "ar" : "en";

  return (
    <StayShell token={token} title={locale === "ar" ? "خصّص إقامتك" : "Customize your stay"} back>
      <CustomizeForm token={token} locale={locale} initialPrefs={prefs ?? null} />
    </StayShell>
  );
}
