import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { hashToken, isTokenExpired } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";
import { StayShell } from "@/components/stay/StayShell";
import { ManualClient } from "@/components/stay/ManualClient";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ManualPage({ params }: Props) {
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
    .select("check_out, property_id, properties(name, name_ar, wifi_ssid, wifi_password_encrypted)")
    .eq("id", tokenRow.booking_id)
    .single<{
      check_out: string;
      property_id: string;
      properties: {
        name: string;
        name_ar: string;
        wifi_ssid: string | null;
        wifi_password_encrypted: string | null;
      };
    }>();

  if (!booking) notFound();
  if (isTokenExpired(booking.check_out)) notFound();

  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties;

  // Fetch manual content for this property
  const { data: entries } = await supabase
    .from("property_content")
    .select("id, section, sort_order, title_en, title_ar, body_en, body_ar")
    .eq("property_id", booking.property_id)
    .eq("is_published", true)
    .order("sort_order")
    .returns<{
      id: string;
      section: string;
      sort_order: number;
      title_en: string;
      title_ar: string;
      body_en: string;
      body_ar: string;
    }[]>();

  // Decrypt wifi password for display — server-side only
  let wifiPassword: string | null = null;
  if (property?.wifi_password_encrypted) {
    try {
      const { decrypt } = await import("@/lib/crypto");
      wifiPassword = decrypt(property.wifi_password_encrypted);
    } catch {
      // log and continue — wifi card will show "contact host"
    }
  }

  return (
    <StayShell
      token={token}
      back
      title={isAr ? property?.name_ar : property?.name}
    >
      <ManualClient
        entries={entries ?? []}
        wifiSsid={property?.wifi_ssid ?? null}
        wifiPassword={wifiPassword}
        locale={locale}
      />
    </StayShell>
  );
}
