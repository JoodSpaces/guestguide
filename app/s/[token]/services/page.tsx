import { notFound, redirect } from "next/navigation";
import { hashToken, isTokenExpired } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";
import { StayShell } from "@/components/stay/StayShell";
import { ServicesClient } from "@/components/stay/ServicesClient";

interface Props { params: Promise<{ token: string }> }

export default async function ServicesPage({ params }: Props) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) notFound();

  const hash = hashToken(token);
  const supabase = createServiceClient();

  const { data: tokenRow } = await supabase
    .from("stay_tokens")
    .select("booking_id, revoked_at, bookings(check_out, guest_lang)")
    .eq("token_hash", hash)
    .single<{ booking_id: string; revoked_at: string | null; bookings: { check_out: string; guest_lang: string } | { check_out: string; guest_lang: string }[] }>();

  if (!tokenRow || tokenRow.revoked_at) notFound();

  const booking = Array.isArray(tokenRow.bookings) ? tokenRow.bookings[0] : tokenRow.bookings;
  if (!booking) notFound();
  if (isTokenExpired(booking.check_out)) redirect(`/s/${token}/expired`);

  const [{ data: services }, { data: myRequests }] = await Promise.all([
    supabase.from("services").select("*").eq("is_active", true).order("sort_order").order("created_at"),
    supabase
      .from("service_requests")
      .select("id, service_id, quantity, status, guest_notes, paymob_payment_url, created_at, services(name_en, price_egp)")
      .eq("booking_id", tokenRow.booking_id)
      .order("created_at", { ascending: false }),
  ]);

  const locale = booking.guest_lang === "ar" ? "ar" : "en";

  return (
    <StayShell token={token} title={locale === "ar" ? "الخدمات" : "Services"} back>
      <h2 className="font-display" style={{ fontSize: "clamp(1.6rem, 5vw, 2.2rem)", marginBottom: "24px" }}>
        {locale === "ar" ? "الخدمات" : "Services"}
      </h2>
      <ServicesClient token={token} services={(services as never) ?? []} myRequests={(myRequests as never) ?? []} />
    </StayShell>
  );
}
