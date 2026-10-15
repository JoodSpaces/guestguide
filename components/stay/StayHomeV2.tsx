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

const glass = "stay-glass";

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

  const label = { color: "var(--jood-mid)", fontFamily: "var(--font-label)", fontSize: 11, fontWeight: 600, letterSpacing: isAr ? 0 : "0.1em", textTransform: "uppercase" as const };
  const tile = { width: 40, height: 40, borderRadius: 14, display: "grid", placeItems: "center", background: "#FFFFFF", color: "var(--jood-ink)", flex: "none" } as const;

  return (
    <main className="stay-root" style={{ minHeight: "100dvh", padding: "0 16px 120px", maxWidth: 480, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 12px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/jood-logo-dark.png" alt="JOOD" className="jood-logo" style={{ height: 22, width: "auto" }} />
        <LanguageToggle />
      </header>

      {/* the welcome: one white card, the greeting, the house and the countdown */}
      <section className="hero-card">
        <p className="hero-label">{t(KICKER(hour) as never)} · {propertyName}</p>
        <h1 style={{ margin: "6px 0 14px", color: "#FFFFFF" }}>{greeting} {guestName}</h1>
        <CountdownChip phase={payload.phase as never} checkIn={payload.checkIn} checkOut={payload.checkOut} />
      </section>

      {requestSummary?.payNow && (
        <a href={requestSummary.payNow.url} className={glass} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 16px", borderRadius: 16, margin: "12px 0 0", textDecoration: "none", color: "var(--jood-ink)", boxShadow: "inset 3px 0 0 var(--jood-accent), 0 0 0 1px rgba(53,30,28,.08)" }}>
          <span><span style={{ ...label, display: "block" }}>{isAr ? "بانتظار الدفع" : "Ready to pay"}</span>{requestSummary.payNow.serviceName}</span>
          <span aria-hidden style={{ color: "var(--jood-accent)" }}>{isAr ? "←" : "→"}</span>
        </a>
      )}

      {/* the concierge: one clear row, the orb has moved to its own page */}
      <Link href={`/s/${token}/concierge`} className={glass} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 16, margin: "12px 0 0", textDecoration: "none", color: "var(--jood-ink)" }}>
        <span style={{ ...tile, background: "var(--jood-accent)", color: "#fff" }}><AppIcon name={aiEnabled ? "ai" : "chat"} size={20} /></span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontWeight: 600, fontSize: 15 }}>{aiEnabled ? (isAr ? "تحدث مع المساعد" : "Talk to your concierge") : (isAr ? "راسل الفريق" : "Message the team")}</span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--jood-ink-muted)", marginTop: 1 }}>{aiEnabled ? (isAr ? "اسأل أي شيء عن إقامتك" : "Ask anything about your stay") : (isAr ? "شخص حقيقي يردّ عليك" : "A person replies")}</span>
        </span>
        <span aria-hidden style={{ color: "var(--jood-mid)" }}>{isAr ? "←" : "→"}</span>
      </Link>

      <p style={{ ...label, margin: "22px 2px 8px" }}>{isAr ? "الأساسيات" : "Essentials"}</p>
      <div className={glass} style={{ borderRadius: 16, overflow: "hidden" }}>
        {essentials.map((e, i) => (
          <Link key={e.icon} href={e.href} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", textDecoration: "none", color: "var(--jood-ink)", borderTop: i ? "1px solid var(--jood-line)" : "none" }}>
            <span style={tile}><AppIcon name={e.icon} size={19} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 600, fontSize: 14.5, lineHeight: 1.3 }}>{e.title}</span>
              <span style={{ display: "block", fontSize: 12.5, color: "var(--jood-ink-muted)", marginTop: 1, lineHeight: 1.4 }}>{e.sub}</span>
            </span>
            <span aria-hidden style={{ color: "var(--jood-mid)" }}>{isAr ? "←" : "→"}</span>
          </Link>
        ))}
      </div>

      {(tonightNote || tonightNoteAr) && <div style={{ marginTop: 12 }}><TonightCard token={token} note={tonightNote ?? ""} noteAr={tonightNoteAr ?? ""} isAr={isAr} /></div>}
      {(hostPick || hostPickAr) && (
        <div className={glass} style={{ borderRadius: 16, padding: "16px 18px", marginTop: 12 }}>
          <p style={{ ...label, margin: "0 0 6px" }}>{isAr ? "نصيحة من مضيفك" : "From your host"}</p>
          <p style={{ fontSize: 15, lineHeight: 1.5, margin: 0 }}>{isAr ? (hostPickAr ?? hostPick) : (hostPick ?? hostPickAr)}</p>
        </div>
      )}

      {more.length > 0 && (
        <>
          <p style={{ ...label, margin: "22px 2px 8px" }}>{isAr ? "المزيد لإقامتك" : "More for your stay"}</p>
          <div className={glass} style={{ borderRadius: 16, overflow: "hidden" }}>
            {more.map((m, i) => (
              <Link key={m.icon} href={m.href} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", textDecoration: "none", color: "var(--jood-ink)", borderTop: i ? "1px solid var(--jood-line)" : "none" }}>
                <AppIcon name={m.icon} size={19} style={{ color: "var(--jood-accent)" }} />
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500 }}>{m.title}</span>
                <span aria-hidden style={{ color: "var(--jood-mid)" }}>{isAr ? "←" : "→"}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop: 22 }}><WeatherStrip token={token} isAr={isAr} /></div>
      <p style={{ textAlign: "center", fontSize: "0.6875rem", color: "var(--jood-ink-subtle)", fontFamily: "var(--font-label)", padding: "22px 0 0" }}>
        <a href={`${WEBSITE_URL}/legal#privacy`} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
          {isAr ? "الخصوصية وكيف نتعامل مع بياناتك" : "Privacy and how we handle your data"}
        </a>
      </p>

      <BottomNav token={token} active="home" />
    </main>
  );
}
