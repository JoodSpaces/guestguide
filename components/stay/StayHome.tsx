"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { HeroColor } from "@/components/ui/HeroColor";
import { BottomNav } from "@/components/stay/BottomNav";
import { CountdownChip } from "@/components/stay/CountdownChip";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { CinematicReveal } from "@/components/stay/CinematicReveal";
import { useTimeAmbience } from "@/components/ui/TimeAmbience";
import { IntentSelector } from "@/components/stay/IntentSelector";
import { WeatherStrip } from "@/components/stay/WeatherStrip";
import { TonightCard } from "@/components/stay/TonightCard";

/* ── Time helpers (unchanged) ───────────────────────────────────────────── */
function getTimeKicker(h: number) {
  if (h >= 5 && h < 9)   return { kickerKey: "time_of_day.morning_kicker",      taglineKey: "time_of_day.morning_tagline" };
  if (h >= 9 && h < 11)  return { kickerKey: "time_of_day.morning_kicker" };
  if (h >= 11 && h < 15) return { kickerKey: "time_of_day.midday_kicker",       taglineKey: "time_of_day.midday_tagline" };
  if (h >= 15 && h < 17) return { kickerKey: "time_of_day.afternoon_kicker" };
  if (h >= 17 && h < 20) return { kickerKey: "time_of_day.golden_hour_kicker",  taglineKey: "time_of_day.golden_hour_tagline" };
  return { kickerKey: "time_of_day.evening_kicker" };
}

function getContextNudge(phase: string, hour: number, checkOut: string, isAr: boolean, token: string) {
  const checkOutDate = new Date(checkOut);
  const hoursUntilCheckout = (checkOutDate.getTime() - Date.now()) / (1000 * 60 * 60);
  const checkOutTime = checkOutDate.toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "numeric", minute: "2-digit" });

  if (phase === "living") {
    if (hour >= 5 && hour < 11)  return isAr
      ? { text: "ابدأ يومك بأفضل وجهات الإفطار القريبة.", cta: "اكتشف الأماكن", href: `/s/${token}/discover` }
      : { text: "Start your morning right — local breakfast spots nearby.", cta: "Explore", href: `/s/${token}/discover` };
    if (hour >= 11 && hour < 16) return isAr
      ? { text: "وقت الظل والمسبح. هل تحتاج شيئاً؟", cta: "طلب خدمة", href: `/s/${token}/services` }
      : { text: "Pool and shade o'clock. Need anything brought up?", cta: "Order", href: `/s/${token}/services` };
    if (hour >= 16 && hour < 20) return isAr
      ? { text: "الساعة الذهبية — وقت مثالي لاستكشاف المنطقة.", cta: "اكتشف", href: `/s/${token}/discover` }
      : { text: "Golden hour — perfect time to explore the area.", cta: "Discover", href: `/s/${token}/discover` };
    return isAr
      ? { text: "هل تحتاج شيئاً لإكمال ليلتك؟", cta: "الخدمات", href: `/s/${token}/services` }
      : { text: "Need anything to round out your evening?", cta: "Services", href: `/s/${token}/services` };
  }
  if (phase === "departure") {
    if (hoursUntilCheckout > 3) return isAr
      ? { text: `المغادرة اليوم الساعة ${checkOutTime}. تريد الاستمرار أطول؟`, cta: "تمديد الإقامة", href: `/s/${token}/services` }
      : { text: `Checkout today at ${checkOutTime}. Want to stay a little longer?`, cta: "Late checkout", href: `/s/${token}/services` };
    return isAr
      ? { text: "نأمل أن إقامتك كانت رائعة. هنا إذا احتجت شيئاً قبل المغادرة.", cta: "تواصل معنا", href: `/s/${token}/requests` }
      : { text: "Hope your stay was wonderful. We're here if you need anything before you head out.", cta: "Reach us", href: `/s/${token}/requests` };
  }
  if (phase === "settling") return isAr
    ? { text: "اكتشف ما حولك — أفضل الأماكن في المنطقة.", cta: "استكشف", href: `/s/${token}/discover` }
    : { text: "Get your bearings — best spots in the area.", cta: "Explore", href: `/s/${token}/discover` };
  return null;
}

/* ── Types ───────────────────────────────────────────────────────────────── */
interface StayPayload {
  guestFirstName: string;
  guestFirstNameAr?: string;
  propertyName: string;
  propertyNameAr?: string;
  phase: string;
  checkIn: string;
  checkOut: string;
  unitNumber?: string;
  wifiPassword?: string;
  doorCode?: string;
}

interface RequestSummary { count: number; payNow: { url: string; serviceName: string } | null; }

interface StayHomeProps {
  payload: StayPayload;
  token: string;
  requestSummary?: RequestSummary | null;
  tonightNote?: string | null;
  tonightNoteAr?: string | null;
  heroImageUrl?: string | null;
}

/* ── Carousel portrait card ─────────────────────────────────────────────── */
function PortraitCard({
  href, eyebrow, title, arrow = "Open →", dark = false, faded = false, icon,
}: {
  href: string; eyebrow: string; title: string; arrow?: string;
  dark?: boolean; faded?: boolean; icon?: string;
}) {
  return (
    <Link
      href={href}
      style={{
        flexShrink: 0,
        width: "172px",
        height: "216px",
        borderRadius: "20px",
        padding: "20px",
        textDecoration: "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        opacity: faded ? 0.45 : 1,
        ...(dark
          ? { backgroundColor: "#251A18" }
          : {
              backgroundColor: "var(--jood-surface)",
              border: "1px solid var(--jood-line)",
            }
        ),
      }}
    >
      <div>
        <p style={{
          fontFamily: "var(--font-label)",
          fontSize: "8px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: dark ? "var(--jood-aqua)" : "var(--jood-ink-faint)",
          marginBottom: "10px",
        }}>
          {eyebrow}
        </p>
        <p style={{
          fontFamily: "var(--font-display)",
          fontSize: "22px",
          fontWeight: 300,
          fontStyle: "italic",
          lineHeight: 1.1,
          color: dark ? "#EDE9E0" : "var(--jood-ink)",
        }}>
          {title}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {icon && (
          <span style={{ fontSize: "20px", lineHeight: 1 }}>{icon}</span>
        )}
        <p style={{
          fontFamily: "var(--font-label)",
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: dark ? "rgba(245,244,237,0.22)" : "var(--jood-ink-faint)",
        }}>
          {arrow}
        </p>
      </div>
    </Link>
  );
}

/* ── Component ───────────────────────────────────────────────────────────── */
export function StayHome({
  payload, token, requestSummary = null,
  tonightNote = null, tonightNoteAr = null, heroImageUrl = null,
}: StayHomeProps) {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";
  const propertyName = isAr ? (payload.propertyNameAr ?? payload.propertyName) : payload.propertyName;
  const guestName = isAr ? (payload.guestFirstNameAr ?? payload.guestFirstName) : payload.guestFirstName;
  const ambience = useTimeAmbience();

  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(id);
  }, []);

  const timeKickerKeys = getTimeKicker(hour);
  const timeKicker = {
    kicker: t(timeKickerKeys.kickerKey as any),
    tagline: (timeKickerKeys as any).taglineKey ? t((timeKickerKeys as any).taglineKey) : undefined,
  };
  const nudge = getContextNudge(payload.phase, hour, payload.checkOut, isAr, token);
  const [, setIntent] = useState<string | null>(null);

  // Variable font weight on scroll — applied to greeting when hero is text-only
  const greetingRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const onScroll = () => {
      if (!greetingRef.current) return;
      const progress = Math.min(1, window.scrollY / 200);
      const weight = Math.round(300 + progress * 400);
      greetingRef.current.style.fontVariationSettings = `'wght' ${weight}`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isDeparture = payload.phase === "departure";

  return (
    <main style={{ minHeight: "100dvh", backgroundColor: "var(--jood-ground)", ...ambience }}>
      <CinematicReveal token={token} propertyName={propertyName} locale={locale} />
      <ScrollProgress />

      {/* ── Full-bleed hero ──────────────────────────────────────────────── */}
      <div style={{
        position: "relative",
        height: "clamp(300px, 72vw, 420px)",
        overflow: "hidden",
        background: heroImageUrl
          ? "#1E1511"
          : "linear-gradient(155deg, #263028 0%, #351E1C 40%, #4A2E1E 70%, #351E1C 100%)",
      }}>
        {heroImageUrl && <HeroColor imageUrl={heroImageUrl} />}

        {heroImageUrl && (
          <img
            src={heroImageUrl}
            alt={propertyName}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}

        {/* Gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(28,25,23,0.82) 0%, rgba(28,25,23,0.18) 50%, rgba(28,25,23,0.06) 100%)",
        }} />

        {/* Floating header — logo + controls */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          padding: "16px 22px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          zIndex: 10,
        }}>
          <img
            src="/jood-logo-dark.png"
            alt="JOOD"
            style={{ height: "22px", filter: "brightness(0) invert(1) opacity(0.9)", display: "block" }}
          />
          <div style={{ display: "flex", gap: "6px" }}>
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>

        {/* Hero text */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "24px 22px 32px",
          zIndex: 5,
        }}>
          <p style={{
            fontFamily: "var(--font-label)",
            fontSize: "8.5px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(245,244,237,0.42)",
            marginBottom: "8px",
          }}>
            {timeKicker.kicker} · {propertyName}
          </p>

          <p
            ref={greetingRef}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(3rem, 11vw, 4.8rem)",
              fontWeight: 300,
              fontStyle: "italic",
              color: "#F5F4ED",
              lineHeight: 0.95,
              letterSpacing: "-0.01em",
              fontVariationSettings: "'wght' 300",
            }}
          >
            {isAr ? "أهلاً،" : (hour < 12 ? "Good morning," : hour < 17 ? "Good afternoon," : "Good evening,")}<br />
            <span style={{ color: "#C49A82" }}>{guestName}</span>
          </p>
        </div>
      </div>

      {/* ── Nudge strip ──────────────────────────────────────────────────── */}
      {nudge && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 22px",
          borderBottom: "1px solid var(--jood-line)",
          gap: "12px",
        }}>
          <p style={{ flex: 1, fontSize: "13.5px", color: "var(--jood-ink-muted)", lineHeight: 1.45, fontFamily: "var(--font-body)" }}>
            {nudge.text}
          </p>
          <a
            href={nudge.href}
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "9px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--jood-garnet)",
              textDecoration: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {nudge.cta} →
          </a>
        </div>
      )}

      {/* ── Countdown ────────────────────────────────────────────────────── */}
      <div style={{
        padding: "12px 22px",
        borderBottom: "1px solid var(--jood-line)",
        display: "flex", gap: "8px", flexWrap: "wrap",
      }}>
        <CountdownChip phase={payload.phase as any} checkIn={payload.checkIn} checkOut={payload.checkOut} />
      </div>

      {/* ── Your stay carousel ───────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "20px 22px 14px" }}>
        <p style={{
          fontFamily: "var(--font-display)",
          fontSize: "28px",
          fontWeight: 400,
          fontStyle: "italic",
          color: "var(--jood-ink)",
          lineHeight: 1,
        }}>
          {isAr ? "إقامتك" : "Your stay"}
        </p>
        <a href={`/s/${token}/services`} style={{
          fontFamily: "var(--font-label)",
          fontSize: "9px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--jood-ink-faint)",
          textDecoration: "none",
        }}>
          {isAr ? "الكل →" : "All →"}
        </a>
      </div>

      {/* Horizontal scroll carousel */}
      <div style={{
        overflowX: "auto",
        display: "flex",
        gap: "10px",
        paddingLeft: "22px",
        paddingRight: "22px",
        paddingBottom: "28px",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      } as React.CSSProperties}>
        {/* Primary: services / active phase */}
        <PortraitCard
          href={`/s/${token}/services`}
          eyebrow={isAr ? "متاح الآن" : "Available now"}
          title={isAr ? "اطلب\nخدمة." : "Request\nanything."}
          arrow={isAr ? "فتح →" : "Open →"}
          dark
        />

        {/* Discover */}
        <PortraitCard
          href={`/s/${token}/discover`}
          eyebrow={isAr ? "اكتشف" : "Discover"}
          title={isAr ? "استكشف\nالمنطقة" : "Explore\nthe area"}
          icon="◎"
          arrow={isAr ? "عرض →" : "View →"}
        />

        {/* Door code */}
        <PortraitCard
          href={`/s/${token}`}
          eyebrow={isAr ? "الدخول" : "Access"}
          title={isAr ? "رمز\nالباب" : "Door\ncode"}
          icon="🗝"
          arrow={isAr ? "عرض →" : "View →"}
        />

        {/* Help */}
        <PortraitCard
          href={`/s/${token}/requests`}
          eyebrow={isAr ? "المساعدة" : "Help"}
          title={isAr ? "تواصل\nمع الفريق" : "Contact\nthe team"}
          icon="💬"
          arrow={isAr ? "إرسال →" : "Send →"}
        />

        {/* Checkout — faded when not yet departure */}
        <PortraitCard
          href={`/s/${token}/checkout`}
          eyebrow={isAr ? "يوم المغادرة" : "Checkout day"}
          title={isAr ? "قائمة\nالمغادرة" : "Check-\nout"}
          icon="📋"
          arrow={isAr ? "عرض →" : "View →"}
          faded={!isDeparture}
        />
      </div>

      {/* ── Intent selector ──────────────────────────────────────────────── */}
      <div style={{ padding: "0 22px 24px" }}>
        <IntentSelector isAr={isAr} onChange={setIntent} />
      </div>

      {/* ── Weather ──────────────────────────────────────────────────────── */}
      <div style={{ padding: "0 22px 24px" }}>
        <WeatherStrip isAr={isAr} />
      </div>

      {/* ── Tonight note ─────────────────────────────────────────────────── */}
      {(tonightNote || tonightNoteAr) && (
        <div style={{ padding: "0 22px 24px" }}>
          <TonightCard
            note={isAr ? (tonightNoteAr ?? tonightNote ?? "") : (tonightNote ?? "")}
            isAr={isAr}
          />
        </div>
      )}

      <div style={{ height: "70px" }} />
      <BottomNav token={token} active="home" />
    </main>
  );
}
