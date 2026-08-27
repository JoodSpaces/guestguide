"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface Props {
  bookingId: string;
  token: string;
  checkoutDate: string;
  checkoutTime: string;
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

export function CheckoutClient({
  bookingId,
  token,
  checkoutDate,
  checkoutTime,
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
      // non-critical — show confirmation anyway
      setDeparted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <h1
        className="font-display animate-reveal"
        style={{ fontSize: "clamp(1.8rem, 5vw, 2.6rem)", color: "var(--jood-ink)", marginBottom: "4px" }}
      >
        {t("title")}
      </h1>

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
              <span
                style={{
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
                }}
              >
                {i + 1}
              </span>
              <span style={{ color: "var(--jood-ink)", fontSize: "0.9375rem", lineHeight: 1.55 }}>
                {item}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* We've left button */}
      {departed ? (
        <div
          style={{
            padding: "20px 24px",
            backgroundColor: "var(--jood-surface)",
            border: "1px solid var(--jood-line)",
            borderRadius: "var(--radius-lg)",
            textAlign: "center",
          }}
        >
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
        <p
          style={{
            color: "var(--jood-ink-muted)",
            fontSize: "0.8125rem",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          {t("departed_confirm")}
        </p>
      )}
    </div>
  );
}
