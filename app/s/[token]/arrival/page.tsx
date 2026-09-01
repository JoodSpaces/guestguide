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
        requires_code_second_factor, wifi_network, wifi_password
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
        wifi_network: string | null;
        wifi_password: string | null;
      };
    }>();

  if (!booking) notFound();
  if (isTokenExpired(booking.check_out)) notFound();

  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties;

  const unlocked = isArrivalUnlocked(booking.check_in);
  const propertyName = isAr ? property?.name_ar : property?.name;

  const checkInDate = new Date(booking.check_in);
  const checkInFormatted = checkInDate.toLocaleDateString(isAr ? "ar-EG" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const mapsUrl = property?.map_pin_lat && property?.map_pin_lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${property.map_pin_lat},${property.map_pin_lng}`
    : null;

  const whatsappUrl = property?.on_call_phone
    ? `https://wa.me/${property.on_call_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hi, I need help getting into ${property?.name ?? "the property"} (booking ref: ${tokenRow.booking_id.slice(0, 8).toUpperCase()})`
      )}`
    : null;

  const steps = isAr
    ? ["ابحث عن البوابة الرئيسية وأدخل رمز المجمع", "اتجه إلى المبنى وابحث عن رقم الوحدة", "أدخل رمز الباب المعروض أعلاه"]
    : ["Find the main gate and enter the compound code", "Head to your building and locate your unit number", "Enter the door code shown above to unlock"];

  return (
    <StayShell token={token} back title={propertyName}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* ── Property hero line ── */}
        <div style={{ marginBottom: "4px" }}>
          <p style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--jood-ink-muted)",
            marginBottom: "6px",
          }}>
            {isAr ? "وصول" : "Arrival"} · {checkInFormatted}
          </p>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem, 6vw, 2.5rem)",
            fontWeight: 600,
            color: "var(--jood-ink)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            margin: 0,
          }}>
            {propertyName}
          </h1>
        </div>

        {/* ── Door code ── */}
        {unlocked ? (
          <DoorCode
            token={token}
            requiresSecondFactor={property?.requires_code_second_factor ?? false}
          />
        ) : (
          <div style={{
            background: "linear-gradient(135deg, var(--jood-ink) 0%, #4a2220 100%)",
            borderRadius: "var(--radius-lg)",
            padding: "clamp(24px, 4vw, 40px)",
          }}>
            <p style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(245,244,237,0.4)",
              marginBottom: "14px",
            }}>
              {t("door_code_label")}
            </p>
            <p style={{ color: "rgba(245,244,237,0.9)", fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 500, marginBottom: "8px" }}>
              {t("locked_title")}
            </p>
            <p style={{ color: "rgba(245,244,237,0.5)", fontSize: "0.875rem", lineHeight: 1.6, margin: 0 }}>
              {t("locked_body")}
            </p>
          </div>
        )}

        {/* ── Getting here ── */}
        <div style={{
          background: "var(--jood-surface)",
          border: "1px solid var(--jood-line)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "18px 20px 14px" }}>
            <p style={{
              fontFamily: "var(--font-label)",
              fontSize: "10px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: "var(--jood-ink-muted)",
              marginBottom: "14px",
            }}>
              {isAr ? "خطوات الوصول" : "Getting there"}
            </p>
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0" }}>
              {steps.map((step, i) => (
                <li key={i} style={{
                  display: "flex",
                  gap: "14px",
                  alignItems: "flex-start",
                  padding: "12px 0",
                  borderBottom: i < steps.length - 1 ? "1px solid var(--jood-line)" : "none",
                }}>
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    color: "var(--jood-accent)",
                    flexShrink: 0,
                    paddingTop: "2px",
                    width: "20px",
                  }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: "14px", color: "var(--jood-ink)", lineHeight: 1.55 }}>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Directions CTA — flush to card bottom */}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                background: "var(--jood-ink)",
                textDecoration: "none",
                gap: "12px",
              }}
            >
              <div>
                <p style={{ color: "var(--jood-ground)", fontSize: "14px", fontFamily: "var(--font-body)", margin: "0 0 2px" }}>
                  {isAr ? "افتح في خرائط جوجل" : "Open in Google Maps"}
                </p>
                <p style={{ color: "rgba(245,244,237,0.45)", fontSize: "11px", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
                  {isAr ? "نقطة الوصول الدقيقة" : "Pinned drop point"}
                </p>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(245,244,237,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
            </a>
          )}
        </div>

        {/* ── Wi-Fi ── */}
        {property?.wifi_network && (
          <div style={{
            background: "var(--jood-surface)",
            border: "1px solid var(--jood-line)",
            borderRadius: "var(--radius-lg)",
            padding: "18px 20px",
          }}>
            <p style={{
              fontFamily: "var(--font-label)",
              fontSize: "10px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: "var(--jood-ink-muted)",
              marginBottom: "12px",
            }}>
              {isAr ? "الواي فاي" : "Wi-Fi"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--jood-ink-muted)" }}>
                  {isAr ? "الشبكة" : "Network"}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--jood-ink)", letterSpacing: "0.05em" }}>
                  {property.wifi_network}
                </span>
              </div>
              {property.wifi_password && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--jood-ink-muted)" }}>
                    {isAr ? "كلمة المرور" : "Password"}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--jood-ink)", letterSpacing: "0.05em" }}>
                    {property.wifi_password}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Need help ── */}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "16px 20px",
              background: "var(--jood-surface)",
              border: "1px solid var(--jood-line)",
              borderRadius: "var(--radius-lg)",
              textDecoration: "none",
            }}
          >
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "rgba(37,211,102,0.12)",
              border: "1px solid rgba(37,211,102,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(37,211,102,0.9)">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: "var(--jood-ink)", fontSize: "14px", margin: "0 0 2px" }}>
                {t("trouble")}
              </p>
              <p style={{ color: "var(--jood-ink-muted)", fontSize: "12px", margin: 0 }}>
                {isAr ? "تواصل مع فريق جود فوراً" : "JOOD team replies within minutes"}
              </p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--jood-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        )}
      </div>
    </StayShell>
  );
}
