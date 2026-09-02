"use client";

import { useState } from "react";

const TAGLINES: Record<string, { en: string; ar: string }> = {
  departure:  { en: "Every great stay deserves to be remembered.", ar: "كل إقامة رائعة تستحق أن تُتذكر." },
  afterglow:  { en: "Some places stay with you long after you leave.", ar: "بعض الأماكن تبقى معك طويلاً بعد المغادرة." },
  living:     { en: "You're in the middle of something special.", ar: "أنت في قلب شيء مميز." },
  settling:   { en: "The best moments are still ahead.", ar: "أفضل اللحظات لا تزال في انتظارك." },
};

interface Props {
  guestFirstName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  phase: string;
  locale: string;
  token: string;
}

export function MemoryCard({ guestFirstName, propertyName, checkIn, checkOut, nights, phase, locale, token }: Props) {
  const isAr = locale === "ar";
  const tagline = (TAGLINES[phase] ?? TAGLINES.afterglow)[isAr ? "ar" : "en"];
  const [copied, setCopied] = useState(false);

  function share() {
    const url = `${window.location.origin}/s/${token}/memory`;
    const text = isAr
      ? `${nights} ليلة في ${propertyName} — إقامة لا تُنسى مع JOOD`
      : `${nights} night${nights !== 1 ? "s" : ""} at ${propertyName} — an unforgettable stay with JOOD`;

    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "My JOOD Stay", text, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  const nightLabel = isAr ? `${nights} ليلة` : `${nights} night${nights !== 1 ? "s" : ""}`;

  return (
    <div style={{ padding: "0 0 40px" }}>
      {/* The card itself */}
      <div style={{
        position: "relative",
        borderRadius: "24px",
        overflow: "hidden",
        background: "linear-gradient(160deg, #1C1410 0%, #2A1A14 40%, #1C1C2E 100%)",
        padding: "48px 36px 40px",
        marginBottom: "24px",
        minHeight: "480px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}>
        {/* Ambient glow top-right */}
        <div style={{
          position: "absolute", top: "-30px", right: "-30px",
          width: "160px", height: "160px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(196,154,130,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        {/* Ambient glow bottom-left */}
        <div style={{
          position: "absolute", bottom: "-40px", left: "-40px",
          width: "200px", height: "200px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(115,54,53,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Top: JOOD wordmark + date */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "48px" }}>
            <p style={{
              fontFamily: "var(--font-label)",
              fontSize: "9px",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "rgba(245,244,237,0.35)",
            }}>
              JOOD · {isAr ? "إقامة" : "Stay"}
            </p>
            <p style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "rgba(245,244,237,0.25)",
              letterSpacing: "0.04em",
            }}>
              {nightLabel}
            </p>
          </div>

          {/* Guest name */}
          <p style={{
            fontFamily: "var(--font-label)",
            fontSize: "9px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#C49A82",
            marginBottom: "10px",
          }}>
            {isAr ? "أقام هنا" : "Stayed here"}
          </p>
          <p style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.8rem, 10vw, 4rem)",
            fontWeight: 300,
            fontStyle: "italic",
            color: "#F5F4ED",
            lineHeight: 0.95,
            letterSpacing: "-0.01em",
            marginBottom: "6px",
          }}>
            {guestFirstName}
          </p>
        </div>

        {/* Middle: property + dates */}
        <div>
          <div style={{
            width: "40px", height: "1px",
            background: "rgba(245,244,237,0.15)",
            marginBottom: "20px",
          }} />
          <p style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.4rem, 5vw, 1.8rem)",
            fontWeight: 300,
            fontStyle: "italic",
            color: "rgba(245,244,237,0.7)",
            lineHeight: 1.15,
            marginBottom: "16px",
          }}>
            {propertyName}
          </p>
          <p style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "rgba(245,244,237,0.28)",
            letterSpacing: "0.06em",
          }}>
            {checkIn} — {checkOut}
          </p>
        </div>

        {/* Bottom: tagline */}
        <div>
          <div style={{
            width: "40px", height: "1px",
            background: "rgba(245,244,237,0.1)",
            marginBottom: "20px",
          }} />
          <p style={{
            fontFamily: "var(--font-display)",
            fontSize: "14px",
            fontWeight: 300,
            fontStyle: "italic",
            color: "rgba(245,244,237,0.38)",
            lineHeight: 1.5,
            maxWidth: "260px",
          }}>
            {tagline}
          </p>
        </div>
      </div>

      {/* Share / copy button */}
      <button
        onClick={share}
        style={{
          width: "100%",
          padding: "16px",
          background: "none",
          border: "1px solid var(--jood-line)",
          borderRadius: "var(--radius-lg)",
          fontFamily: "var(--font-label)",
          fontSize: "10px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: copied ? "var(--jood-success)" : "var(--jood-ink-muted)",
          cursor: "pointer",
          transition: "color 200ms",
        }}
      >
        {copied
          ? (isAr ? "تم النسخ ✓" : "Link copied ✓")
          : (isAr ? "شارك هذه الذكرى" : "Share this memory")}
      </button>

      <p style={{
        marginTop: "16px",
        textAlign: "center",
        fontSize: "11px",
        color: "var(--jood-ink-ghost)",
        fontFamily: "var(--font-label)",
        letterSpacing: "0.08em",
      }}>
        {isAr ? "شكراً لإقامتك معنا ✦" : "Thank you for staying with us ✦"}
      </p>
    </div>
  );
}
