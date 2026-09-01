"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { TokenPayload, Phase } from "@/lib/token";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { PhaseCard, type CardVariant } from "@/components/stay/PhaseCard";
import { QuickHelpFab } from "@/components/stay/QuickHelpFab";
import { CountdownChip } from "@/components/stay/CountdownChip";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { CinematicReveal } from "@/components/stay/CinematicReveal";
import { useTimeAmbience } from "@/components/ui/TimeAmbience";
import { IntentSelector, type Intent } from "@/components/stay/IntentSelector";
import { WeatherStrip } from "@/components/stay/WeatherStrip";
import { TonightCard } from "@/components/stay/TonightCard";

function getTimeKicker(h: number, isAr: boolean): { kicker: string; tagline?: string } {
  if (h >= 5 && h < 9)   return { kicker: isAr ? "صباح الخير" : "GOOD MORNING", tagline: isAr ? "الساعة الذهبية قبل الحر." : "Golden hour before the heat." };
  if (h >= 9 && h < 11)  return { kicker: isAr ? "صباح الخير" : "GOOD MORNING" };
  if (h >= 11 && h < 15) return { kicker: isAr ? "وقت الظهيرة" : "MIDDAY", tagline: isAr ? "وقت الظل والمسبح." : "Pool and shade o'clock." };
  if (h >= 15 && h < 17) return { kicker: isAr ? "بعد الظهر" : "AFTERNOON" };
  if (h >= 17 && h < 20) return { kicker: isAr ? "الساعة الذهبية" : "GOLDEN HOUR", tagline: isAr ? "أفضل وقت للشاطئ." : "Best time for the water." };
  return { kicker: isAr ? "مساء الخير" : "GOOD EVENING" };
}

function getContextNudge(
  phase: Phase,
  hour: number,
  checkOut: string,
  isAr: boolean,
  token: string,
): { text: string; cta: string; href: string } | null {
  const checkOutDate = new Date(checkOut);
  const hoursUntilCheckout = (checkOutDate.getTime() - Date.now()) / (1000 * 60 * 60);
  const checkOutTime = checkOutDate.toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "numeric", minute: "2-digit" });

  if (phase === "living") {
    if (hour >= 5 && hour < 11)
      return isAr
        ? { text: "ابدأ يومك بأفضل وجهات الإفطار القريبة.", cta: "اكتشف الأماكن", href: `/s/${token}/discover` }
        : { text: "Start your morning right — local breakfast spots nearby.", cta: "Explore", href: `/s/${token}/discover` };
    if (hour >= 11 && hour < 16)
      return isAr
        ? { text: "وقت الظل والمسبح. هل تحتاج شيئاً؟", cta: "طلب خدمة", href: `/s/${token}/services` }
        : { text: "Pool and shade o'clock. Need anything brought up?", cta: "Order", href: `/s/${token}/services` };
    if (hour >= 16 && hour < 20)
      return isAr
        ? { text: "الساعة الذهبية — وقت مثالي لاستكشاف المنطقة.", cta: "اكتشف", href: `/s/${token}/discover` }
        : { text: "Golden hour — perfect time to explore the area.", cta: "Discover", href: `/s/${token}/discover` };
    return isAr
      ? { text: "هل تحتاج شيئاً لإكمال ليلتك؟", cta: "الخدمات", href: `/s/${token}/services` }
      : { text: "Need anything to round out your evening?", cta: "Services", href: `/s/${token}/services` };
  }

  if (phase === "departure") {
    if (hoursUntilCheckout > 3)
      return isAr
        ? { text: `المغادرة اليوم الساعة ${checkOutTime}. تريد الاستمرار أطول؟`, cta: "تمديد الإقامة", href: `/s/${token}/services` }
        : { text: `Checkout today at ${checkOutTime}. Want to stay a little longer?`, cta: "Late checkout", href: `/s/${token}/services` };
    return isAr
      ? { text: "نأمل أن إقامتك كانت رائعة. هنا إذا احتجت شيئاً قبل المغادرة.", cta: "تواصل معنا", href: `/s/${token}/requests` }
      : { text: "Hope your stay was wonderful. We're here if you need anything before you head out.", cta: "Reach us", href: `/s/${token}/requests` };
  }

  if (phase === "settling")
    return isAr
      ? { text: "اكتشف ما حولك — أفضل الأماكن في المنطقة.", cta: "استكشف", href: `/s/${token}/discover` }
      : { text: "Get your bearings — best spots in the area.", cta: "Explore", href: `/s/${token}/discover` };

  return null;
}

interface RequestSummary {
  count: number;
  payNow: { url: string; serviceName: string } | null;
}

interface Props {
  payload: TokenPayload;
  token: string;
  requestSummary?: RequestSummary | null;
  tonightNote?: string | null;
  tonightNoteAr?: string | null;
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
const IconConcierge = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l1.8 5.4L19.2 9l-4.5 4.2 1.5 5.8L12 16l-4.2 3 1.5-5.8L4.8 9l5.4-1.6L12 2z"/>
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

export function StayHome({ payload, token, requestSummary, tonightNote = null, tonightNoteAr = null }: Props) {
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
  const nudge = getContextNudge(payload.phase, hour, payload.checkOut, isAr, token);
  const [intent, setIntent] = useState<Intent | null>(null);

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
        <div className="animate-reveal mb-8" style={{ animationDelay: "0ms" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--jood-accent)", marginBottom: "12px", opacity: 0.9 }}>
            {timeKicker.kicker}
          </p>
          <h1 className="font-display" style={{ fontSize: "clamp(2.8rem, 9vw, 4.5rem)", color: "var(--jood-ink)", lineHeight: 1.05, fontStyle: "normal", letterSpacing: "-0.01em" }}>
            {isAr ? "أهلاً، " : "Hello, "}
            <em style={{ color: "var(--jood-accent)", fontStyle: isAr ? "normal" : "italic" }}>
              {payload.guestFirstName}
            </em>
          </h1>
          <div style={{ marginTop: "10px" }}>
            <CountdownChip phase={payload.phase} checkIn={payload.checkIn} checkOut={payload.checkOut} />
          </div>
          {timeKicker.tagline && (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "var(--jood-ink-muted)", marginTop: "10px", lineHeight: 1.5 }}>
              {timeKicker.tagline}
            </p>
          )}
          {nudge && (
            <div
              style={{
                marginTop: "16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                backgroundColor: "var(--jood-surface)",
                boxShadow: "var(--shadow-card)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <p style={{ flex: 1, fontSize: "0.8125rem", color: "var(--jood-ink-muted)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
                {nudge.text}
              </p>
              <a
                href={nudge.href}
                style={{
                  flexShrink: 0,
                  fontSize: "0.6875rem",
                  fontFamily: "var(--font-label)",
                  letterSpacing: "0.12em",
                  color: "var(--jood-accent)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  textTransform: "uppercase",
                }}
              >
                {nudge.cta} →
              </a>
            </div>
          )}
        </div>

        {/* Pay-now nudge */}
        {requestSummary?.payNow && (
          <div
            className="animate-reveal"
            style={{
              animationDelay: "60ms",
              marginBottom: "16px",
              padding: "14px 18px",
              backgroundColor: "rgba(255, 96, 55, 0.08)",
              border: "1px solid var(--jood-accent)",
              borderRadius: "var(--radius-lg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div>
              <p style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--jood-ink)", marginBottom: "2px" }}>
                {isAr ? "في انتظار الدفع" : "Payment pending"}
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--jood-ink-muted)" }}>
                {requestSummary.payNow.serviceName}
              </p>
            </div>
            <a
              href={requestSummary.payNow.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flexShrink: 0,
                padding: "8px 16px",
                backgroundColor: "var(--jood-accent)",
                color: "white",
                borderRadius: "var(--radius-pill)",
                textDecoration: "none",
                fontSize: "0.8125rem",
                fontWeight: 500,
              }}
            >
              {isAr ? "ادفع الآن" : "Pay now"} →
            </a>
          </div>
        )}

        {/* Request count chip */}
        {requestSummary && !requestSummary.payNow && requestSummary.count > 0 && (
          <div className="animate-reveal" style={{ animationDelay: "60ms", marginBottom: "16px" }}>
            <a
              href={`/s/${token}/services`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                border: "1px solid var(--jood-line)",
                borderRadius: "var(--radius-pill)",
                textDecoration: "none",
                color: "var(--jood-ink-muted)",
                fontSize: "0.75rem",
                fontFamily: "var(--font-label)",
                letterSpacing: "0.08em",
              }}
            >
              <span style={{ color: "var(--jood-aqua)" }}>●</span>
              {isAr
                ? `${requestSummary.count} ${requestSummary.count === 1 ? "طلب" : "طلبات"}`
                : `${requestSummary.count} service ${requestSummary.count === 1 ? "request" : "requests"}`}
            </a>
          </div>
        )}

        {/* Intent selector — living/settling phases only */}
        {(payload.phase === "living" || payload.phase === "settling") && (
          <div className="animate-reveal" style={{ animationDelay: "80ms" }}>
            <IntentSelector isAr={isAr} onChange={setIntent} />
          </div>
        )}

        {/* Live ambient strip */}
        <WeatherStrip token={token} isAr={isAr} />

        {/* Primary card */}
        <div className="stagger-item" style={{ "--si": 1, marginBottom: "10px" } as React.CSSProperties}>
          <PrimaryCard payload={payload} token={token} isAr={isAr} />
        </div>

        {/* Tonight card — living phase, after primary card */}
        {payload.phase === "living" && (
          <TonightCard
            token={token}
            isAr={isAr}
            note={tonightNote}
            noteAr={tonightNoteAr}
          />
        )}

        {/* Secondary cards */}
        <SecondaryCards payload={payload} token={token} t={t} isAr={isAr} hour={hour} intent={intent} />

        {/* Property soul footer */}
        <div
          style={{
            marginTop: "40px",
            paddingTop: "24px",
            borderTop: "1px solid var(--jood-line)",
            textAlign: isAr ? "right" : "left",
          }}
        >
          <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.4rem, 4vw, 2rem)", color: "var(--jood-ink-faint)", lineHeight: 1.15, fontWeight: 600 }}>
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
        variant="primary"
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
      <PhaseCard href={`/s/${token}/checkout`} eyebrow={t("phases.departure")} variant="primary" watermark={<WmDoor />}>
        <p className="font-display" style={{ fontSize: "clamp(1.2rem, 3.5vw, 1.6rem)" }}>
          {t("checkout.time")}
        </p>
      </PhaseCard>
    );
  }

  return (
    <PhaseCard href={`/s/${token}/manual`} eyebrow={t("nav.manual")} variant="primary" watermark={<WmBook />}>
      <p className="font-display" style={{ fontSize: "clamp(1.2rem, 3.5vw, 1.6rem)" }}>
        {t("manual.card_body")}
      </p>
    </PhaseCard>
  );
}

/* ─── Secondary cards ────────────────────────────────────────────────────── */
function SecondaryCards({ payload, token, t, isAr, hour, intent }: {
  payload: TokenPayload;
  token: string;
  t: ReturnType<typeof useTranslations>;
  isAr: boolean;
  hour: number;
  intent: Intent | null;
}) {
  const isManualPrimary =
    payload.phase !== "arrival" &&
    payload.phase !== "settling" &&
    payload.phase !== "departure";

  const arrivalCard = payload.arrivalUnlocked && payload.phase !== "arrival" && payload.phase !== "settling"
    ? {
        key: "arrival",
        href: `/s/${token}/arrival`,
        label: t("nav.arrival"),
        icon: <IconKey />,
        description: isAr ? "رمز الباب والتوجيهات" : "Door code & directions",
      }
    : null;

  const manualCard = !isManualPrimary
    ? {
        key: "manual",
        href: `/s/${token}/manual`,
        label: t("nav.manual"),
        icon: <IconBook />,
        description: isAr ? "الواي فاي · الأجهزة · القواعد" : "Wi-Fi · Appliances · Rules",
      }
    : null;

  const discoverCard = {
    key: "discover",
    href: `/s/${token}/discover`,
    label: t("nav.discover"),
    icon: <IconCompass />,
    description: isAr ? "المطاعم والأماكن المحلية المفضلة" : "Local spots & restaurants",
  };

  const eatDiscoverCard = {
    ...discoverCard,
    description: isAr ? "أفضل مطاعم المنطقة" : "Best restaurants nearby",
  };

  const servicesCard = {
    key: "services",
    href: `/s/${token}/services`,
    label: t("nav.services"),
    icon: <IconSparkle />,
    description: isAr ? "إضافات اختيارية لإقامتك" : "Add-ons for your stay",
  };

  const relaxServicesCard = {
    ...servicesCard,
    description: isAr ? "مناشف · مسبح · خدمة الغرف" : "Towels · Pool · Room service",
  };

  const conciergeCard = {
    key: "concierge",
    href: `/s/${token}/concierge`,
    label: isAr ? "كونسيرج جود" : "JOOD Concierge",
    icon: <IconConcierge />,
    description: isAr ? "اسألني أي شيء عن إقامتك" : "Ask anything about your stay",
  };

  const requestsCard = {
    key: "requests",
    href: `/s/${token}/requests`,
    label: t("nav.requests"),
    icon: <IconChat />,
    description: isAr ? "تحدث مع فريق جود" : "Talk to the JOOD team",
  };

  // Intent-driven ordering overrides phase/time defaults
  let links: typeof servicesCard[];
  if (intent === "relax") {
    links = [
      relaxServicesCard,
      conciergeCard,
      discoverCard,
      ...(arrivalCard ? [arrivalCard] : []),
      ...(manualCard ? [manualCard] : []),
      requestsCard,
    ];
  } else if (intent === "explore") {
    links = [
      discoverCard,
      conciergeCard,
      servicesCard,
      ...(arrivalCard ? [arrivalCard] : []),
      ...(manualCard ? [manualCard] : []),
      requestsCard,
    ];
  } else if (intent === "eat") {
    links = [
      eatDiscoverCard,
      conciergeCard,
      servicesCard,
      ...(arrivalCard ? [arrivalCard] : []),
      ...(manualCard ? [manualCard] : []),
      requestsCard,
    ];
  } else if (intent === "work") {
    links = [
      ...(manualCard ? [manualCard] : []),
      requestsCard,
      conciergeCard,
      servicesCard,
      discoverCard,
      ...(arrivalCard ? [arrivalCard] : []),
    ];
  } else {
    // Default phase + time-based ordering
    const servicesFirst =
      payload.phase === "departure" ||
      (payload.phase === "living" && hour >= 11 && hour < 16) ||
      (payload.phase === "living" && hour >= 20) ||
      (payload.phase === "living" && hour < 5);

    const conciergeFirst = payload.phase === "living" || payload.phase === "settling";

    links = [
      ...(conciergeFirst ? [conciergeCard] : []),
      ...(arrivalCard ? [arrivalCard] : []),
      ...(manualCard ? [manualCard] : []),
      ...(servicesFirst ? [servicesCard, discoverCard] : [discoverCard, servicesCard]),
      requestsCard,
      ...(!conciergeFirst ? [conciergeCard] : []),
    ];
  }

  // Assign variants: first = secondary (featured), last = cta, middle = tile
  const featured = links[0];
  const ctaCard = links.length > 1 ? links[links.length - 1] : null;
  const tileCards = links.length > 2 ? links.slice(1, -1) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Featured full-width card */}
      {featured && (
        <div className="stagger-item" style={{ "--si": 2 } as React.CSSProperties}>
          <PhaseCard href={featured.href} eyebrow="" icon={featured.icon} description={featured.description} variant="secondary">
            <span>{featured.label}</span>
          </PhaseCard>
        </div>
      )}

      {/* 2-col tile grid */}
      {tileCards.length > 0 && (
        <div className="jood-tile-grid stagger-item" style={{ "--si": 3 } as React.CSSProperties}>
          {tileCards.map((link, i) => (
            <div key={link.key} className="stagger-item" style={{ "--si": i + 4 } as React.CSSProperties}>
              <PhaseCard href={link.href} eyebrow="" icon={link.icon} description={link.description} variant="tile">
                <span>{link.label}</span>
              </PhaseCard>
            </div>
          ))}
        </div>
      )}

      {/* CTA strip */}
      {ctaCard && (
        <div className="stagger-item" style={{ "--si": tileCards.length + 4 } as React.CSSProperties}>
          <PhaseCard href={ctaCard.href} eyebrow="" icon={ctaCard.icon} description={ctaCard.description} variant="cta">
            <span>{ctaCard.label}</span>
          </PhaseCard>
        </div>
      )}
    </div>
  );
}
