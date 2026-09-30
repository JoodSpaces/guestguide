import { notFound, redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { hashToken, isTokenExpired, computePhase } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";
import { StayShell } from "@/components/stay/StayShell";
import { ConciergeClient } from "@/components/stay/ConciergeClient";
import { aiEnabled } from "@/lib/ai";

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
  if (isTokenExpired(booking.check_out)) redirect(`/s/${token}/expired`);

  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties;

  const phase = computePhase(booking.check_in, booking.check_out);
  const propertyName = isAr ? property?.name_ar : property?.name;

  if (!aiEnabled()) {
    return (
      <StayShell token={token} back title={isAr ? "فريق جود" : "JOOD team"} activeTab="concierge">
        <div style={{ padding: "48px 24px", textAlign: "center", maxWidth: "420px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 300, fontSize: "26px", color: "var(--jood-ink)", marginBottom: "12px" }}>
            {isAr ? "نحن على بعد رسالة" : "We're one message away"}
          </h2>
          <p style={{ fontSize: "15px", lineHeight: 1.7, color: "var(--jood-ink-muted)", marginBottom: "24px" }}>
            {isAr
              ? "المساعد الذكي غير متاح بعد. اكتب لفريق جود في أي وقت وسيرد عليك شخص حقيقي."
              : "The AI assistant isn't available yet. Message the JOOD team any time and a person will reply."}
          </p>
          <a
            href={`/s/${token}/requests`}
            style={{ display: "inline-block", padding: "12px 24px", borderRadius: "999px", background: "var(--jood-ink)", color: "var(--jood-ground)", fontSize: "14px", textDecoration: "none" }}
          >
            {isAr ? "تواصل مع فريق جود" : "Message the JOOD team"}
          </a>
        </div>
      </StayShell>
    );
  }

  return (
    <StayShell token={token} back title={isAr ? "كونسيرج جود" : "JOOD Concierge"} activeTab="concierge">
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
