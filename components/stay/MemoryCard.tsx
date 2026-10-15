"use client";

import { useState } from "react";
import { DotNumber } from "@/components/stay/DotNumber";

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
    <div style={{ paddingBottom: 24 }} dir={isAr ? "rtl" : "ltr"}>
      <div className="home-card" style={{ "--c1": "#FF3FA4", "--c2": "#5B7BFF", minHeight: 520, padding: 22, marginBottom: 12, gap: 28 } as React.CSSProperties}>
        <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <small style={{ textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700 }}>JOOD · {isAr ? "إقامة" : "Stay"}</small>
          <small>{nightLabel}</small>
        </span>

        <span style={{ display: "grid", gap: 6 }}>
          <small style={{ textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>{isAr ? "أقام هنا" : "Stayed here"}</small>
          <b style={{ fontSize: "clamp(2.4rem, 11vw, 3.4rem)", lineHeight: 1, letterSpacing: "-0.02em" }}>{guestFirstName}</b>
        </span>

        <span style={{ direction: "ltr", display: "block" }}><DotNumber value={nights} dot={12} gap={6} label={nightLabel} /></span>

        <span style={{ display: "grid", gap: 6 }}>
          <b style={{ fontSize: "1.25rem" }}>{propertyName}</b>
          <small>{checkIn} — {checkOut}</small>
          <small style={{ marginTop: 10, fontSize: ".9rem", fontStyle: "italic", maxWidth: "30ch" }}>{tagline}</small>
        </span>
      </div>

      <button type="button" className="vpill" onClick={share} style={{ background: "#fff", color: "#0E0908", boxShadow: "none" }}>
        <span>{copied ? (isAr ? "تم النسخ ✓" : "Link copied ✓") : (isAr ? "شارك هذه الذكرى" : "Share this memory")}</span>
        <i aria-hidden style={{ background: "#0E0908", color: "#fff" }}>↗</i>
      </button>

      <p style={{ marginTop: 16, textAlign: "center", fontSize: ".74rem", color: "var(--jood-ink-subtle)" }}>
        {isAr ? "شكراً لإقامتك معنا" : "Thank you for staying with us"}
      </p>
    </div>
  );
}
