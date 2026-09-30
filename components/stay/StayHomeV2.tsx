"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { AppIcon } from "@/components/ui/AppIcon";
import { Orb } from "@/components/ui/Orb";
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

  const label = { color: "var(--jood-garnet)", fontFamily: "var(--font-label)", fontSize: 11.5, letterSpacing: "0.16em", textTransform: "uppercase" as const };

  return (
    <main className="stay-root" style={{ minHeight: "100dvh", padding: "0 18px 120px", maxWidth: 480, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0 14px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/jood-logo-dark.png" alt="JOOD" style={{ height: 22, width: "auto", filter: "brightness(0) invert(1) opacity(.92)" }} />
        <LanguageToggle />
      </header>

      <p style={label}>{t(KICKER(hour) as never)} · {propertyName}</p>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "clamp(2.4rem, 11vw, 3.2rem)", lineHeight: 1, letterSpacing: "-0.01em", margin: "8px 0 10px", color: "var(--jood-ink)" }}>
        {greeting}<br /><em style={{ color: "#FF6037" }}>{guestName}</em>
      </h1>
      <div style={{ margin: "0 0 4px" }}>
        <CountdownChip phase={payload.phase as never} checkIn={payload.checkIn} checkOut={payload.checkOut} />
      </div>

      <div style={{ margin: "18px 0 4px" }}>
        <Orb size={176} label={aiEnabled ? (isAr ? "تحدث مع المساعد" : "Talk to your concierge") : (isAr ? "راسل الفريق" : "Message the team")} onClick={() => router.push(`/s/${token}/concierge`)} />
        <p style={{ textAlign: "center", marginTop: 6, color: "var(--jood-ink-subtle)", fontFamily: "var(--font-label)", fontSize: 12, letterSpacing: isAr ? 0 : "0.18em", textTransform: "uppercase" }}>
          {aiEnabled ? (isAr ? "اضغط لتسأل أي شيء" : "Tap to ask anything") : (isAr ? "اضغط لمراسلة الفريق" : "Tap to message the team")}
        </p>
      </div>

      {requestSummary?.payNow && (
        <a href={requestSummary.payNow.url} className={glass} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", borderRadius: 18, margin: "16px 0 0", textDecoration: "none", color: "var(--jood-ink)" }}>
          <span><span style={{ ...label, display: "block" }}>{isAr ? "بانتظار الدفع" : "Ready to pay"}</span>{requestSummary.payNow.serviceName}</span>
          <span aria-hidden style={{ color: "#FF6037" }}>{isAr ? "←" : "→"}</span>
        </a>
      )}

      <p style={{ ...label, margin: "22px 0 10px" }}>{isAr ? "الأساسيات" : "Essentials"}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {essentials.map((e) => (
          <Link key={e.icon} href={e.href} className={glass} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 14, minHeight: 112, padding: 16, borderRadius: 22, textDecoration: "none", color: "var(--jood-ink)" }}>
            <span style={{ width: 40, height: 40, borderRadius: 14, display: "grid", placeItems: "center", background: "rgba(237,233,224,.07)", color: "var(--jood-garnet)" }}><AppIcon name={e.icon} size={22} /></span>
            <span>
              <span style={{ display: "block", fontWeight: 500, fontSize: 15, lineHeight: 1.3 }}>{e.title}</span>
              <span style={{ display: "block", fontSize: 12.5, color: "var(--jood-ink-muted)", marginTop: 2, lineHeight: 1.4 }}>{e.sub}</span>
            </span>
          </Link>
        ))}
      </div>

      {(tonightNote || tonightNoteAr) && <div style={{ marginTop: 16 }}><TonightCard token={token} note={tonightNote ?? ""} noteAr={tonightNoteAr ?? ""} isAr={isAr} /></div>}
      {(hostPick || hostPickAr) && (
        <div className={glass} style={{ borderRadius: 22, padding: "18px 20px", marginTop: 14 }}>
          <p style={{ ...label, margin: "0 0 8px" }}>{isAr ? "نصيحة من مضيفك" : "From your host"}</p>
          <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 21, lineHeight: 1.3, margin: 0 }}>{isAr ? (hostPickAr ?? hostPick) : (hostPick ?? hostPickAr)}</p>
        </div>
      )}

      {more.length > 0 && (
        <>
          <p style={{ ...label, margin: "24px 0 10px" }}>{isAr ? "المزيد لإقامتك" : "More for your stay"}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {more.map((m) => (
              <Link key={m.icon} href={m.href} className={glass} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 18, textDecoration: "none", color: "var(--jood-ink)" }}>
                <AppIcon name={m.icon} size={20} style={{ color: "var(--jood-garnet)" }} />
                <span style={{ flex: 1, fontSize: 15 }}>{m.title}</span>
                <span aria-hidden style={{ color: "var(--jood-ink-subtle)" }}>{isAr ? "←" : "→"}</span>
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
