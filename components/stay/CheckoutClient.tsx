"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface Props {
  bookingId: string;
  token: string;
  checkInDate: string;
  checkInMonth: number;
  checkoutDate: string;
  checkoutTime: string;
  nightsCount: number;
  propertyName: string;
  onCallPhone: string | null;
  locale: string;
}

const CHECKLIST = {
  en: [
    "Lock the front door and leave the key inside",
    "Switch off the AC and all lights",
    "Check you haven't left anything behind",
  ],
  ar: [
    "أغلق الباب الأمامي واترك المفتاح بالداخل",
    "أوقف التكييف وجميع الأضواء",
    "تأكد أنك لم تنسَ أي شيء",
  ],
};

// Season-keyed pull quotes indexed by month
const SEASON_QUOTE: Record<string, { en: string; ar: string }> = {
  summer:  { en: "Where the sea decides the schedule.", ar: "حيث البحر هو من يضع جدول اليوم." },
  winter:  { en: "Stillness that only the off-season knows.", ar: "هدوء لا يعرفه إلا من زار في غير أوانه." },
  spring:  { en: "The coast before the crowd arrives.", ar: "الساحل قبل أن يكتشفه الجميع." },
  autumn:  { en: "Golden hour that lasts all day.", ar: "ساعة ذهبية تمتد طوال اليوم." },
};

function getSeason(month: number): "summer" | "winter" | "spring" | "autumn" {
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 11 || month <= 1) return "winter";
  if (month >= 2 && month <= 4) return "spring";
  return "autumn";
}

/* ── Scrapbook postcard ─────────────────────────────────────────────────── */
function ScrapbookCard({
  propertyName,
  checkInDate,
  checkoutDate,
  nightsCount,
  checkInMonth,
  isAr,
}: {
  propertyName: string;
  checkInDate: string;
  checkoutDate: string;
  nightsCount: number;
  checkInMonth: number;
  isAr: boolean;
}) {
  const season = getSeason(checkInMonth);
  const quote = SEASON_QUOTE[season];
  const nightsLabel = isAr
    ? `${nightsCount} ${nightsCount === 1 ? "ليلة" : "ليالٍ"}`
    : `${nightsCount} ${nightsCount === 1 ? "night" : "nights"}`;

  return (
    <div
      className="animate-reveal"
      style={{
        backgroundColor: "#351E1C",
        borderRadius: "var(--radius-lg)",
        padding: "clamp(28px, 5vw, 44px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Watermark night count */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          insetInlineEnd: "-12px",
          top: "-16px",
          fontFamily: "var(--font-display)",
          fontSize: "clamp(7rem, 22vw, 11rem)",
          color: "rgba(245,244,237,0.04)",
          lineHeight: 1,
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {nightsCount}
      </div>

      {/* Eyebrow */}
      <p style={{
        fontFamily: "var(--font-mono)",
        fontSize: "9px",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: "rgba(245,244,237,0.35)",
        marginBottom: "20px",
      }}>
        {isAr ? "إقامتك في" : "YOUR STAY AT"}
      </p>

      {/* Property name */}
      <p
        className="font-display"
        style={{
          fontSize: "clamp(1.6rem, 5vw, 2.6rem)",
          fontWeight: 600,
          color: "#F5F4ED",
          lineHeight: 1.1,
          marginBottom: "28px",
        }}
      >
        {propertyName}
      </p>

      {/* Date timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "24px" }}>
        <p style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.8125rem",
          color: "rgba(245,244,237,0.5)",
        }}>
          {checkInDate}
        </p>

        {/* Timeline bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--jood-accent)", flexShrink: 0 }} />
          <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(245,244,237,0.15)", position: "relative" }}>
            <span style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "#351E1C",
              padding: "0 8px",
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(245,244,237,0.4)",
              whiteSpace: "nowrap",
            }}>
              {nightsLabel}
            </span>
          </div>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", border: "1px solid rgba(245,244,237,0.3)", flexShrink: 0 }} />
        </div>

        <p style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.8125rem",
          color: "rgba(245,244,237,0.5)",
        }}>
          {checkoutDate}
        </p>
      </div>

      {/* Pull quote */}
      <p style={{
        fontFamily: "var(--font-body)",
        fontSize: "clamp(0.9rem, 2.5vw, 1.05rem)",
        color: "rgba(245,244,237,0.35)",
        lineHeight: 1.5,
        borderTop: "1px solid rgba(245,244,237,0.08)",
        paddingTop: "16px",
      }}>
        "{isAr ? quote.ar : quote.en}"
      </p>
    </div>
  );
}

export function CheckoutClient({
  bookingId,
  token,
  checkInDate,
  checkInMonth,
  checkoutDate,
  checkoutTime,
  nightsCount,
  propertyName,
  onCallPhone,
  locale,
}: Props) {
  const t = useTranslations("checkout");
  const isAr = locale === "ar";
  const [departed, setDeparted] = useState(false);
  const [loading, setLoading] = useState(false);
  const items = isAr ? CHECKLIST.ar : CHECKLIST.en;

  async function handleDeparted() {
    setLoading(true);
    try {
      await fetch("/api/stay/departed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setDeparted(true);
    } catch {
      setDeparted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Scrapbook postcard */}
      <ScrapbookCard
        propertyName={propertyName}
        checkInDate={checkInDate}
        checkoutDate={checkoutDate}
        nightsCount={nightsCount}
        checkInMonth={checkInMonth}
        isAr={isAr}
      />

      {/* Checkout time card */}
      <div
        style={{
          backgroundColor: "var(--jood-surface)",
          border: "1px solid var(--jood-line)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
        }}
      >
        <p className="label-eyebrow" style={{ color: "var(--jood-ink-muted)", marginBottom: "8px" }}>
          {t("time")}
        </p>
        <p className="font-display" style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", color: "var(--jood-ink)" }}>
          {checkoutTime}
        </p>
        <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.875rem", marginTop: "4px" }}>
          {checkoutDate}
        </p>
      </div>

      {/* Checklist */}
      <div
        style={{
          backgroundColor: "var(--jood-surface)",
          border: "1px solid var(--jood-line)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
        }}
      >
        <p className="label-eyebrow" style={{ color: "var(--jood-ink-muted)", marginBottom: "14px" }}>
          {t("checklist_label")}
        </p>
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map((item, i) => (
            <li key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span style={{
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                border: "1px solid var(--jood-line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.6875rem",
                color: "var(--jood-ink-muted)",
                flexShrink: 0,
                marginTop: "1px",
              }}>
                {i + 1}
              </span>
              <span style={{ color: "var(--jood-ink)", fontSize: "0.9375rem", lineHeight: 1.55 }}>
                {item}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Departed button / confirmation */}
      {departed ? (
        <div style={{
          padding: "20px 24px",
          backgroundColor: "var(--jood-surface)",
          border: "1px solid var(--jood-line)",
          borderRadius: "var(--radius-lg)",
          textAlign: "center",
        }}>
          <p style={{ color: "var(--jood-accent)", fontWeight: 500 }}>
            {isAr ? "شكراً — نراك قريباً!" : "Thank you — see you next time!"}
          </p>
        </div>
      ) : (
        <button
          onClick={handleDeparted}
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px",
            backgroundColor: "var(--jood-ink)",
            color: "var(--jood-ground)",
            border: "none",
            borderRadius: "var(--radius-pill)",
            fontSize: "0.9375rem",
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "opacity 200ms var(--ease-standard)",
          }}
        >
          {loading ? (isAr ? "جارٍ الإرسال…" : "Sending…") : t("departed_cta")}
        </button>
      )}
      {!departed && (
        <p style={{
          color: "var(--jood-ink-muted)",
          fontSize: "0.8125rem",
          textAlign: "center",
          lineHeight: 1.5,
        }}>
          {t("departed_confirm")}
        </p>
      )}
    </div>
  );
}
