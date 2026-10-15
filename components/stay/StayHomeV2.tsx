"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { AppIcon } from "@/components/ui/AppIcon";
import { BottomNav } from "@/components/stay/BottomNav";
import { CountdownChip } from "@/components/stay/CountdownChip";
import { WeatherStrip } from "@/components/stay/WeatherStrip";
import { DotNumber } from "@/components/stay/DotNumber";
import { TonightCard } from "@/components/stay/TonightCard";
import { cairoHour } from "@/lib/cairo-time";
import { WEBSITE_URL } from "@/lib/site";

/** The new look of the guest home: a calm orb for the concierge, the essentials as glass tiles, the rest below. Same data as StayHome. */
interface Props {
  payload: { guestFirstName: string; guestFirstNameAr?: string; propertyName: string; propertyNameAr?: string; phase: string; checkIn: string; checkOut: string };
  token: string;
  requestSummary?: { count: number; payNow: { url: string; serviceName: string } | null } | null;
  tonightNote?: string | null;
  tonightNoteAr?: string | null;
  hostPick?: string | null;
  hostPickAr?: string | null;
  hasArrivalPrefs?: boolean;
  aiEnabled?: boolean;
}

const KICKER = (h: number) =>
  h >= 5 && h < 11 ? "time_of_day.morning_kicker" : h >= 11 && h < 15 ? "time_of_day.midday_kicker" : h >= 15 && h < 17 ? "time_of_day.afternoon_kicker" : h >= 17 && h < 20 ? "time_of_day.golden_hour_kicker" : "time_of_day.evening_kicker";


export function StayHomeV2({ payload, token, requestSummary = null, tonightNote = null, tonightNoteAr = null, hostPick = null, hostPickAr = null, hasArrivalPrefs = false, aiEnabled = true }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";
  const propertyName = isAr ? (payload.propertyNameAr ?? payload.propertyName) : payload.propertyName;
  const guestName = isAr ? (payload.guestFirstNameAr ?? payload.guestFirstName) : payload.guestFirstName;
  const [hour, setHour] = useState(() => cairoHour());
  useEffect(() => { const id = setInterval(() => setHour(cairoHour()), 60_000); return () => clearInterval(id); }, []);

  const greeting = isAr ? "أهلاً،" : hour >= 5 && hour < 12 ? "Good morning," : hour >= 12 && hour < 17 ? "Good afternoon," : "Good evening,";
  const isDeparture = payload.phase === "departure";
  const isAfterOrDeparture = isDeparture || payload.phase === "afterglow";
  const isPreArrival = payload.phase === "anticipation" || payload.phase === "preparation";

  const essentials = [
    { href: `/s/${token}/arrival`,  icon: "key",      title: isAr ? "رمز الباب" : "Door code",          sub: isAr ? "الدخول والاتجاهات" : "Access and directions" },
    { href: `/s/${token}/manual`,   icon: "book",     title: isAr ? "دليل البيت" : "House guide",       sub: isAr ? "الواي فاي والأجهزة والقواعد" : "Wi-Fi, appliances, rules" },
    { href: `/s/${token}/requests`, icon: "chat",     title: isAr ? "تواصل مع الفريق" : "Contact the team", sub: isAr ? "نردّ عليك" : "A person replies" },
    { href: `/s/${token}/services`, icon: "services", title: isAr ? "اطلب خدمة" : "Order a service",     sub: isAr ? "أضف شيئاً لإقامتك" : "Add to your stay" },
  ];
  const more = [
    { href: `/s/${token}/discover`, icon: "discover", title: isAr ? "استكشف المنطقة" : "Explore the area", show: true },
    { href: `/s/${token}/customize`, icon: "ai", title: hasArrivalPrefs ? (isAr ? "تفضيلات وصولك (تم)" : "Your arrival preferences (done)") : (isAr ? "خصّص إقامتك" : "Customize your stay"), show: isPreArrival },
    { href: `/s/${token}/checkout`, icon: "checkout", title: isAr ? "قائمة المغادرة" : "Check-out", show: isDeparture },
    { href: `/s/${token}/memory`, icon: "memory", title: isAr ? "ذكرى إقامتك" : "Your stay, remembered", show: isAfterOrDeparture },
  ].filter((m) => m.show);

  // The big number: days until arrival, then nights left. Read after mount so the server and the phone never disagree.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); }, []);
  const DAY = 86_400_000;
  const toIn = now === null ? null : Math.max(0, Math.ceil((new Date(payload.checkIn).getTime() - now) / DAY));
  const toOut = now === null ? null : Math.max(0, Math.ceil((new Date(payload.checkOut).getTime() - now) / DAY));
  const before = now !== null && new Date(payload.checkIn).getTime() > now;
  const big = before ? toIn : toOut;
  const bigLabel = before ? (isAr ? "يوم حتى الوصول" : "days until you arrive") : (isAr ? "ليلة متبقية" : "nights left");

  const tag = { fontFamily: "var(--font-label)", fontSize: 11, fontWeight: 600, letterSpacing: isAr ? 0 : "0.1em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.62)" };

  return (
    <main className="stay-root aura" style={{ minHeight: "100dvh", padding: "0 16px 130px", maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <div className="aura-bg" aria-hidden />

      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0 6px", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/jood-logo-dark.png" alt="JOOD" style={{ height: 22, width: "auto", filter: "brightness(0) invert(1)" }} />
        <LanguageToggle />
      </header>

      {/* The number, in dots */}
      <section style={{ position: "relative", padding: "22px 4px 8px" }}>
        <p style={tag}>{t(KICKER(hour) as never)} · {propertyName}</p>
        <h1 className="aura-title">{greeting} {guestName}</h1>
        <div style={{ marginTop: 26, minHeight: 140 }}>
          {big !== null && <DotNumber value={big} dot={14} gap={7} label={`${big} ${bigLabel}`} />}
        </div>
        <p style={{ ...tag, marginTop: 14 }}>{bigLabel}</p>
        <div style={{ marginTop: 6 }}>
          <CountdownChip phase={payload.phase as never} checkIn={payload.checkIn} checkOut={payload.checkOut} />
        </div>
      </section>

      {requestSummary?.payNow && (
        <a href={requestSummary.payNow.url} className="aura-tile" style={{ "--a1": "#FF6037", "--a2": "#733635", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 18px", margin: "14px 0 0", textDecoration: "none", color: "#fff" } as React.CSSProperties}>
          <span style={{ position: "relative" }}><span style={{ ...tag, display: "block" }}>{isAr ? "بانتظار الدفع" : "Ready to pay"}</span><b style={{ fontWeight: 650 }}>{requestSummary.payNow.serviceName}</b></span>
          <span aria-hidden style={{ position: "relative" }}>{isAr ? "←" : "→"}</span>
        </a>
      )}

      {/* The concierge: a glowing sheet and one pill */}
      <Link href={`/s/${token}/concierge`} className="aura-tile aura-hero" style={{ "--a1": "#FF3D8B", "--a2": "#733635" } as React.CSSProperties}>
        <span style={{ ...tag, position: "relative" }}>{isAr ? "المساعد" : "Concierge"}</span>
        <b className="aura-hero-title">{aiEnabled ? (isAr ? "اسأل عن أي شيء في إقامتك" : "Ask anything about your stay") : (isAr ? "راسل الفريق" : "Message the team")}</b>
        <span className="aura-cta">
          <span>{aiEnabled ? (isAr ? "ابدأ المحادثة" : "Start talking") : (isAr ? "ابدأ الرسالة" : "Start a message")}</span>
          <i aria-hidden>{isAr ? "←" : "→"}</i>
        </span>
      </Link>

      {/* Essentials: each tile has its own glow */}
      <div className="aura-grid">
        {essentials.map((e, i) => {
          const glow = [["#2FD6A0", "#0B5C57"], ["#6C7BFF", "#2A1B6B"], ["#FF9A3D", "#7A2E10"], ["#FF5FA8", "#5E1B45"]][i % 4];
          return (
            <Link key={e.icon} href={e.href} className="aura-tile aura-sq" style={{ "--a1": glow[0], "--a2": glow[1] } as React.CSSProperties}>
              <span className="aura-ic"><AppIcon name={e.icon} size={20} /></span>
              <span style={{ position: "relative" }}>
                <b className="aura-sq-title">{e.title}</b>
                <small className="aura-sq-sub">{e.sub}</small>
              </span>
            </Link>
          );
        })}
      </div>

      {(tonightNote || tonightNoteAr) && <div style={{ marginTop: 12, position: "relative" }}><TonightCard token={token} note={tonightNote ?? ""} noteAr={tonightNoteAr ?? ""} isAr={isAr} /></div>}
      {(hostPick || hostPickAr) && (
        <div className="aura-tile" style={{ "--a1": "#A0C9CB", "--a2": "#1E4B4F", padding: "18px 20px", marginTop: 12 } as React.CSSProperties}>
          <p style={{ ...tag, margin: "0 0 8px", position: "relative" }}>{isAr ? "نصيحة من مضيفك" : "From your host"}</p>
          <p style={{ fontSize: 18, lineHeight: 1.4, margin: 0, position: "relative", color: "#fff" }}>{isAr ? (hostPickAr ?? hostPick) : (hostPick ?? hostPickAr)}</p>
        </div>
      )}

      {more.length > 0 && (
        <div className="aura-list">
          {more.map((m) => (
            <Link key={m.icon} href={m.href} className="aura-row">
              <AppIcon name={m.icon} size={18} />
              <span style={{ flex: 1 }}>{m.title}</span>
              <span aria-hidden style={{ opacity: .6 }}>{isAr ? "←" : "→"}</span>
            </Link>
          ))}
        </div>
      )}

      <div style={{ marginTop: 22, position: "relative" }}><WeatherStrip token={token} isAr={isAr} /></div>
      <p style={{ textAlign: "center", fontSize: "0.6875rem", color: "rgba(255,255,255,.5)", fontFamily: "var(--font-label)", padding: "22px 0 0", position: "relative" }}>
        <a href={`${WEBSITE_URL}/legal#privacy`} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
          {isAr ? "الخصوصية وكيف نتعامل مع بياناتك" : "Privacy and how we handle your data"}
        </a>
      </p>

      <BottomNav token={token} active="home" />
    </main>
  );
}
