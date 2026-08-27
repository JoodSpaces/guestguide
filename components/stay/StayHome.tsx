"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { TokenPayload } from "@/lib/token";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { PhaseCard } from "@/components/stay/PhaseCard";
import { QuickHelpFab } from "@/components/stay/QuickHelpFab";
import { CountdownChip } from "@/components/stay/CountdownChip";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { CinematicReveal } from "@/components/stay/CinematicReveal";
import { useTimeAmbience } from "@/components/ui/TimeAmbience";

function getTimeKicker(h: number, isAr: boolean): { kicker: string; tagline?: string } {
  if (h >= 5 && h < 9)   return { kicker: isAr ? "صباح الخير" : "GOOD MORNING", tagline: isAr ? "الساعة الذهبية قبل الحر." : "Golden hour before the heat." };
  if (h >= 9 && h < 11)  return { kicker: isAr ? "صباح الخير" : "GOOD MORNING" };
  if (h >= 11 && h < 15) return { kicker: isAr ? "وقت الظهيرة" : "MIDDAY", tagline: isAr ? "وقت الظل والمسبح." : "Pool and shade o'clock." };
  if (h >= 15 && h < 17) return { kicker: isAr ? "بعد الظهر" : "AFTERNOON" };
  if (h >= 17 && h < 20) return { kicker: isAr ? "الساعة الذهبية" : "GOLDEN HOUR", tagline: isAr ? "أفضل وقت للشاطئ." : "Best time for the water." };
  return { kicker: isAr ? "مساء الخير" : "GOOD EVENING" };
}

interface Props {
  payload: TokenPayload;
  token: string;
}

/* ─── SVG icons ─────────────────────────────────────────────────────────── */
const IconKey = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/>
    <path d="M13 10l8-8M21 2l-3.5 3.5M17 6l2-2"/>
  </svg>
);
const IconBook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    <path d="M9 7h6M9 11h4"/>
  </svg>
);
const IconCompass = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"/>
  </svg>
);
const IconSparkle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.09 6.26L21 10l-6.91 1.74L12 18l-2.09-6.26L3 10l6.91-1.74L12 2z"/>
    <path d="M5 3l.88 2.63L8.5 6.5l-2.62.87L5 10l-.88-2.63L1.5 6.5l2.62-.87L5 3z" opacity=".4"/>
  </svg>
);
const IconChat = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);
const IconDoor = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H5a1 1 0 00-1 1v18a1 1 0 001 1h14a1 1 0 001-1V7z"/>
    <path d="M14 2v5h5M14.5 12.5a.5.5 0 110-1 .5.5 0 010 1z" fill="currentColor"/>
  </svg>
);

/* Large watermark versions */
const WmKey = () => (
  <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/><path d="M13 10l8-8M21 2l-3.5 3.5M17 6l2-2"/>
  </svg>
);
const WmBook = () => (
  <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M9 7h6M9 11h4"/>
  </svg>
);
const WmDoor = () => (
  <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="2" width="18" height="20" rx="1"/><path d="M9 12h.01"/>
  </svg>
);

const MARQUEE_ITEMS = ["North Coast", "Sidi Heneish", "Hacienda Bay", "Mediterranean", "Sahel", "Villa Life"];

export function StayHome({ payload, token }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";
  const propertyName = isAr ? payload.propertyNameAr : payload.propertyName;
  const ambience = useTimeAmbience();
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(id);
  }, []);
  const timeKicker = getTimeKicker(hour, isAr);

  return (
    <main className="min-h-dvh" style={{ backgroundColor: "var(--jood-ground)", ...ambience }}>
      <CinematicReveal token={token} propertyName={propertyName} locale={locale} />
      <ScrollProgress />

      {/* Page frame */}
      <div className="fixed pointer-events-none z-50" style={{ inset: "var(--frame-inset)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)" }} />

      {/* Header */}
      <header
        className="flex items-center justify-between px-6 sticky top-0 z-40"
        style={{
          height: "56px",
          borderBottom: "1px solid var(--jood-line)",
          backgroundColor: "rgba(245, 244, 237, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/jood-logo-dark.png" alt="JOOD" style={{ height: "26px", width: "auto" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--jood-ink-muted)" }}>
            {propertyName}
          </span>
          <LanguageToggle />
        </div>
      </header>

      {/* Content */}
      <div className="px-6 pb-24" style={{ paddingTop: "clamp(28px, 4vw, 44px)" }}>

        {/* Greeting */}
        <div className="animate-reveal mb-6" style={{ animationDelay: "0ms" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--jood-accent)", marginBottom: "10px" }}>
            {timeKicker.kicker}
          </p>
          <h1 className="font-display" style={{ fontSize: "clamp(2rem, 6vw, 3rem)", color: "var(--jood-ink)", lineHeight: 1.1, fontStyle: "normal" }}>
            {isAr ? "أهلاً، " : "Hello, "}
            <em style={{ color: "var(--jood-accent)", fontStyle: isAr ? "normal" : "italic" }}>
              {payload.guestFirstName}
            </em>
          </h1>
          <CountdownChip phase={payload.phase} checkIn={payload.checkIn} checkOut={payload.checkOut} />
          {timeKicker.tagline && (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--jood-ink-muted)", marginTop: "8px", fontStyle: "italic" }}>
              {timeKicker.tagline}
            </p>
          )}
        </div>

        {/* Marquee strip */}
        <div style={{ overflow: "hidden", borderBlock: "1px solid var(--jood-line)", marginBottom: "24px", padding: "9px 0" }}>
          <div dir="ltr" className="jood-marquee-track" style={{ display: "inline-flex", gap: "18px", alignItems: "center", whiteSpace: "nowrap" }}>
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].flatMap((place, i) => [
              <span key={`p-${i}`} style={{ fontFamily: "var(--font-label)", fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--jood-ink-muted)" }}>{place}</span>,
              <span key={`d-${i}`} style={{ color: "var(--jood-accent)", fontSize: "8px" }}>●</span>,
            ])}
          </div>
        </div>

        {/* Primary card */}
        <div className="stagger-item mb-4" style={{ "--si": 1 } as React.CSSProperties}>
          <PrimaryCard payload={payload} token={token} isAr={isAr} />
        </div>

        {/* Secondary cards */}
        <div className="grid gap-3">
          <SecondaryCards payload={payload} token={token} t={t} isAr={isAr} />
        </div>

        {/* Property soul footer */}
        <div
          style={{
            marginTop: "40px",
            paddingTop: "24px",
            borderTop: "1px solid var(--jood-line)",
            textAlign: isAr ? "right" : "left",
          }}
        >
          <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.4rem, 4vw, 2rem)", color: "var(--jood-ink-faint)", lineHeight: 1.15, fontStyle: "italic" }}>
            {propertyName}
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--jood-ink-ghost)", marginTop: "6px" }}>
            {isAr ? "مدعوم من جود" : "Powered by JOOD"}
          </p>
        </div>
      </div>

      <QuickHelpFab />
    </main>
  );
}

/* ─── Primary card ───────────────────────────────────────────────────────── */
function PrimaryCard({ payload, token, isAr }: { payload: TokenPayload; token: string; isAr: boolean }) {
  const t = useTranslations();

  if (payload.phase === "arrival" || payload.phase === "settling") {
    return (
      <PhaseCard
        href={`/s/${token}/arrival`}
        eyebrow={t("phases.arrival")}
        locked={!payload.arrivalUnlocked}
        lockedLabel={t("arrival.locked_title")}
        primary
        watermark={<WmKey />}
      >
        <p className="font-display" style={{ fontSize: "clamp(1.2rem, 3.5vw, 1.6rem)" }}>
          {payload.arrivalUnlocked ? t("arrival.door_code_label") : t("arrival.locked_body")}
        </p>
      </PhaseCard>
    );
  }

  if (payload.phase === "departure") {
    return (
      <PhaseCard href={`/s/${token}/checkout`} eyebrow={t("phases.departure")} primary watermark={<WmDoor />}>
        <p className="font-display" style={{ fontSize: "clamp(1.2rem, 3.5vw, 1.6rem)" }}>
          {t("checkout.time")}
        </p>
      </PhaseCard>
    );
  }

  return (
    <PhaseCard href={`/s/${token}/manual`} eyebrow={t("nav.manual")} primary watermark={<WmBook />}>
      <p className="font-display" style={{ fontSize: "clamp(1.2rem, 3.5vw, 1.6rem)" }}>
        {t("manual.card_body")}
      </p>
    </PhaseCard>
  );
}

/* ─── Secondary cards ────────────────────────────────────────────────────── */
function SecondaryCards({ payload, token, t, isAr }: { payload: TokenPayload; token: string; t: ReturnType<typeof useTranslations>; isAr: boolean }) {
  const isManualPrimary =
    payload.phase !== "arrival" &&
    payload.phase !== "settling" &&
    payload.phase !== "departure";

  const links = [
    ...(payload.arrivalUnlocked && payload.phase !== "arrival" && payload.phase !== "settling"
      ? [{
          href: `/s/${token}/arrival`,
          label: t("nav.arrival"),
          icon: <IconKey />,
          description: isAr ? "رمز الباب والتوجيهات" : "Door code & directions",
        }]
      : []),
    ...(!isManualPrimary
      ? [{
          href: `/s/${token}/manual`,
          label: t("nav.manual"),
          icon: <IconBook />,
          description: isAr ? "الواي فاي · الأجهزة · القواعد" : "Wi-Fi · Appliances · Rules",
        }]
      : []),
    {
      href: `/s/${token}/discover`,
      label: t("nav.discover"),
      icon: <IconCompass />,
      description: isAr ? "المطاعم والأماكن المحلية المفضلة" : "Local spots & restaurants",
    },
    {
      href: `/s/${token}/services`,
      label: t("nav.services"),
      icon: <IconSparkle />,
      description: isAr ? "إضافات اختيارية لإقامتك" : "Add-ons for your stay",
    },
    {
      href: `/s/${token}/requests`,
      label: t("nav.requests"),
      icon: <IconChat />,
      description: isAr ? "تحدث مع فريق جود" : "Talk to the JOOD team",
    },
  ];

  return (
    <>
      {links.map((link, i) => (
        <div key={link.href} className="stagger-item" style={{ "--si": i + 2 } as React.CSSProperties}>
          <PhaseCard href={link.href} eyebrow="" icon={link.icon} description={link.description}>
            <span style={{ color: "var(--jood-ink)", fontWeight: 500 }}>{link.label}</span>
          </PhaseCard>
        </div>
      ))}
    </>
  );
}
