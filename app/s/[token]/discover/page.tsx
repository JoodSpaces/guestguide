import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { hashToken, isTokenExpired } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";
import { StayShell } from "@/components/stay/StayShell";
import { DiscoverScreen } from "@/components/stay/DiscoverScreen";

interface Props {
  params: Promise<{ token: string }>;
}

export type Recommendation = {
  id: string;
  category: string;
  name: string;
  blurb_en: string;
  blurb_ar: string;
  lat: number | null;
  lng: number | null;
  price_band: number | null;
  jood_can_arrange: boolean;
  sort_order: number;
  scope: string;
};

export default async function DiscoverPage({ params }: Props) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) notFound();

  const locale = await getLocale();
  const supabase = createServiceClient();

  const { data: tokenRow } = await supabase
    .from("stay_tokens")
    .select("booking_id, revoked_at")
    .eq("token_hash", hashToken(token))
    .single<{ booking_id: string; revoked_at: string | null }>();

  if (!tokenRow || tokenRow.revoked_at) notFound();

  const { data: booking } = await supabase
    .from("bookings")
    .select(`check_out, property_id, properties (id, name, name_ar, city, lat, lng, wifi_ssid, checkout_time, on_call_phone)`)
    .eq("id", tokenRow.booking_id)
    .single<{
      check_out: string;
      property_id: string;
      properties:
        | { id: string; name: string; name_ar: string; city: string; lat: number | null; lng: number | null; wifi_ssid: string | null; checkout_time: string | null; on_call_phone: string | null }
        | { id: string; name: string; name_ar: string; city: string; lat: number | null; lng: number | null; wifi_ssid: string | null; checkout_time: string | null; on_call_phone: string | null }[];
    }>();

  if (!booking) notFound();
  if (isTokenExpired(booking.check_out)) notFound();

  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties;

  // Fetch recs: property-scoped first, then city, then global
  const { data: recs } = await supabase
    .from("recommendations")
    .select(
      "id, category, name, blurb_en, blurb_ar, lat, lng, price_band, jood_can_arrange, sort_order, scope"
    )
    .or(
      `scope.eq.global,and(scope.eq.city,city.eq.${property?.city ?? ""}),and(scope.eq.property,property_id.eq.${property?.id ?? ""})`
    )
    .order("scope", { ascending: false }) // property > city > global
    .order("sort_order", { ascending: true })
    .returns<Recommendation[]>();

  const propertyName = locale === "ar" ? property?.name_ar : property?.name;

  return (
    <StayShell token={token} back title={propertyName}>
      <DiscoverScreen
        recs={recs ?? []}
        locale={locale}
        token={token}
        propertyLat={property?.lat ?? null}
        propertyLng={property?.lng ?? null}
        wifiSsid={property?.wifi_ssid ?? null}
        checkoutTime={property?.checkout_time ?? null}
        onCallPhone={property?.on_call_phone ?? null}
      />
    </StayShell>
  );
}
