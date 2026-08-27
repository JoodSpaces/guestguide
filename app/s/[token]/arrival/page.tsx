import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { hashToken, isArrivalUnlocked, isTokenExpired } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";
import { DoorCode } from "@/components/stay/DoorCode";
import { StayShell } from "@/components/stay/StayShell";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ArrivalPage({ params }: Props) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) notFound();

  const t = await getTranslations("arrival");
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
    .select(`
      check_in, check_out,
      properties (
        name, name_ar, map_pin_lat, map_pin_lng, on_call_phone,
        requires_code_second_factor
      )
    `)
    .eq("id", tokenRow.booking_id)
    .single<{
      check_in: string;
      check_out: string;
      properties: {
        name: string;
        name_ar: string;
        map_pin_lat: number | null;
        map_pin_lng: number | null;
        on_call_phone: string;
        requires_code_second_factor: boolean;
      };
    }>();

  if (!booking) notFound();
  if (isTokenExpired(booking.check_out)) notFound();

  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties;

  const unlocked = isArrivalUnlocked(booking.check_in);
  const propertyName = isAr ? property?.name_ar : property?.name;

  const mapsUrl = property?.map_pin_lat && property?.map_pin_lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${property.map_pin_lat},${property.map_pin_lng}`
    : null;

  const whatsappUrl = property?.on_call_phone
    ? `https://wa.me/${property.on_call_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hi, I need help getting into ${property?.name ?? "the property"} (booking ref: ${tokenRow.booking_id.slice(0, 8).toUpperCase()})`
      )}`
    : null;

  return (
    <StayShell token={token} back title={isAr ? property?.name_ar : property?.name}>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* Door code — locked or revealed */}
        {unlocked ? (
          <DoorCode
            token={token}
            requiresSecondFactor={property?.requires_code_second_factor ?? false}
          />
        ) : (
          <div
            style={{
              backgroundColor: "var(--jood-surface)",
              border: "1px solid var(--jood-line)",
              borderRadius: "var(--radius-lg)",
              padding: "clamp(24px, 4vw, 36px)",
            }}
          >
            <p className="label-eyebrow" style={{ color: "var(--jood-ink-muted)", marginBottom: "10px" }}>
              {t("door_code_label")}
            </p>
            <p style={{ color: "var(--jood-ink)", fontWeight: 500, marginBottom: "8px" }}>
              {t("locked_title")}
            </p>
            <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
              {t("locked_body")}
            </p>
          </div>
        )}

        {/* Directions card */}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              backgroundColor: "var(--jood-surface)",
              border: "1px solid var(--jood-line)",
              borderRadius: "var(--radius-lg)",
              padding: "20px 24px",
              textDecoration: "none",
            }}
          >
            <p className="label-eyebrow" style={{ color: "var(--jood-ink-muted)", marginBottom: "6px" }}>
              {t("directions_label")}
            </p>
            <p style={{ color: "var(--jood-ink)", fontWeight: 500 }}>
              {isAr ? "افتح في خرائط جوجل" : "Open in Google Maps"}
            </p>
            <p style={{ color: "var(--jood-accent)", fontSize: "0.8125rem", marginTop: "4px" }}>
              {isAr ? "رابط نقطة الوصول الدقيقة ←" : "Pinned drop point →"}
            </p>
          </a>
        )}

        {/* Arrival photo sequence — placeholder until media is uploaded */}
        <div
          style={{
            backgroundColor: "var(--jood-surface)",
            border: "1px solid var(--jood-line)",
            borderRadius: "var(--radius-lg)",
            padding: "20px 24px",
          }}
        >
          <p className="label-eyebrow" style={{ color: "var(--jood-ink-muted)", marginBottom: "12px" }}>
            {isAr ? "الطريق إلى الوحدة" : "Getting to your unit"}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
            }}
          >
            {["Compound gate", "Building entrance", "Your door"].map((label, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "3/4",
                  backgroundColor: "var(--jood-line)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  alignItems: "flex-end",
                  padding: "8px",
                  opacity: 0.5,
                }}
              >
                <p style={{ fontSize: "0.6875rem", color: "var(--jood-ink-muted)", lineHeight: 1.3 }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginTop: "12px" }}>
            {isAr ? "سيتم إضافة الصور قريباً" : "Photos will be added by your host"}
          </p>
        </div>

        {/* WhatsApp help */}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              border: "1px solid var(--jood-line)",
              borderRadius: "var(--radius-lg)",
              textDecoration: "none",
              backgroundColor: "var(--jood-surface)",
            }}
          >
            <span style={{ color: "var(--jood-ink)", fontSize: "0.9375rem" }}>
              {t("trouble")}
            </span>
            <span style={{
              color: "var(--jood-accent)",
              fontFamily: "var(--font-label)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              fontSize: "0.75rem",
            }}>
              {t("whatsapp_help")}
            </span>
          </a>
        )}
      </div>
    </StayShell>
  );
}
