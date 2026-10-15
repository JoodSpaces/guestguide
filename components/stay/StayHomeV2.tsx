"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { AppIcon } from "@/components/ui/AppIcon";
import { Sun, Sunset, Thermometer, Waves, Wind } from "lucide-react";
import { DotNumber } from "@/components/stay/DotNumber";
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

  // Read the clock after mount, so the server and the phone never disagree about "today".
  const [now, setNow] = useState<number | null>(null);
  const [wx, setWx] = useState<{ tempC: number; sunsetLocal: string; windKph: number; uvIndex: number; waveM: number | null } | null>(null);
  useEffect(() => { setNow(Date.now()); }, []);
  useEffect(() => {
    let off = false;
    fetch(`/api/stay/weather?token=${token}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (!off && d) setWx({ tempC: d.tempC, sunsetLocal: d.sunsetLocal, windKph: d.windKph, uvIndex: d.uvIndex, waveM: d.waveM ?? null }); }).catch(() => {});
    return () => { off = true; };
  }, [token]);

  const DAY = 86_400_000;
  const inMs = new Date(payload.checkIn).getTime();
  const outMs = new Date(payload.checkOut).getTime();
  const before = now !== null && inMs > now;
  const big = now === null ? null : Math.max(0, Math.ceil(((before ? inMs : outMs) - now) / DAY));
  const unit = before ? (isAr ? "يوم حتى الوصول" : "days to arrival") : (isAr ? "ليلة متبقية" : "nights left");
  const nights = Math.max(1, Math.round((outMs - inMs) / DAY));
  const progress = now === null ? 0 : Math.min(1, Math.max(0, (now - inMs) / (outMs - inMs)));
  const fmtDay = (ms: number) => new Date(ms).toLocaleDateString(isAr ? "ar-EG" : "en-GB", { timeZone: "Africa/Cairo", weekday: "short", day: "numeric", month: "short" });
  const fmtTime = (ms: number) => new Date(ms).toLocaleTimeString(isAr ? "ar-EG" : "en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit", hour12: false });

  // The week around today (or around arrival, before it): the stay's days are outlined, today is solid.
  const anchor = now ?? inMs;
  const strip = Array.from({ length: 7 }, (_, i) => anchor + (i - 3) * DAY);
  const sameDay = (a: number, b: number) => new Date(a).toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }) === new Date(b).toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const dayLetter = (ms: number) => new Date(ms).toLocaleDateString(isAr ? "ar-EG" : "en-GB", { timeZone: "Africa/Cairo", weekday: isAr ? "short" : "narrow" });
  const dayNum = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { timeZone: "Africa/Cairo", day: "numeric" });

  const tiles: { href: string; title: string; sub: string; c1: string; c2: string; icon: string }[] = [
    { href: essentials[0].href, title: essentials[0].title, sub: essentials[0].sub, c1: "#16E0B0", c2: "#0A6E6A", icon: essentials[0].icon },
    { href: essentials[1].href, title: essentials[1].title, sub: essentials[1].sub, c1: "#5B7BFF", c2: "#2B2FB0", icon: essentials[1].icon },
    { href: essentials[2].href, title: essentials[2].title, sub: essentials[2].sub, c1: "#FF8A2A", c2: "#B8321A", icon: essentials[2].icon },
    { href: essentials[3].href, title: essentials[3].title, sub: essentials[3].sub, c1: "#FF3FA4", c2: "#7A1FA8", icon: essentials[3].icon },
  ];

  return (
    <main className="stay-root home" style={{ minHeight: "100dvh", padding: "0 16px 48px", maxWidth: 480, margin: "0 auto" }} dir={isAr ? "rtl" : "ltr"}>
      {/* Top: the weather, then the language. No bar. */}
      <div className="home-wx" aria-label={isAr ? "الطقس" : "Weather"}>
        <div className="home-wx-row">
          <span><Thermometer size={15} strokeWidth={1.8} /><b>{wx ? `${Math.round(wx.tempC)}°` : "–"}</b></span>
          <span><Wind size={15} strokeWidth={1.8} /><b>{wx ? Math.round(wx.windKph) : "–"}</b><small>km/h</small></span>
          <span><Sun size={15} strokeWidth={1.8} /><b>{wx ? Math.round(wx.uvIndex) : "–"}</b><small>UV</small></span>
          <span><Sunset size={15} strokeWidth={1.8} /><b>{wx ? wx.sunsetLocal : "–"}</b></span>
          {wx && wx.waveM !== null && <span><Waves size={15} strokeWidth={1.8} /><b>{wx.waveM.toFixed(1)}</b><small>m</small></span>}
        </div>
        <LanguageToggle />
      </div>

      {/* The week, with today lit */}
      <div className="home-days" role="list" aria-label={isAr ? "أيام الإقامة" : "Days of your stay"}>
        {strip.map((ms) => {
          const today = now !== null && sameDay(ms, now);
          const inStay = ms >= inMs - DAY / 2 && ms <= outMs + DAY / 2;
          return (
            <div key={ms} role="listitem" className={`home-day${today ? " today" : inStay ? " stay" : ""}`}>
              <small>{dayLetter(ms)}</small>
              <b>{dayNum(ms)}</b>
            </div>
          );
        })}
      </div>

      {/* The number, with what it counts and the facts around it */}
      <section className="home-main">
        <p className="home-kicker">{isAr ? `أهلاً ${guestName}` : `Hello ${guestName}`}</p>
        <div className="home-num">{big !== null ? <DotNumber value={big} dot={13} gap={6} label={`${big} ${unit}`} /> : <span style={{ height: 91, display: "block" }} />}</div>
        <p className="home-unit">{unit}</p>
        <div className="home-bar" aria-hidden><i style={{ width: `${progress * 100}%` }} /></div>
        <dl className="home-facts">
          <div><dt>{isAr ? "البيت" : "House"}</dt><dd>{propertyName}</dd></div>
          <div><dt>{isAr ? "الوصول" : "Arrive"}</dt><dd><bdi>{fmtDay(inMs)}</bdi></dd></div>
          <div><dt>{isAr ? "المغادرة" : "Leave"}</dt><dd><bdi>{fmtDay(outMs)}</bdi> <bdi>{fmtTime(outMs)}</bdi></dd></div>
          <div><dt>{isAr ? "المدة" : "Nights"}</dt><dd>{nights}</dd></div>
        </dl>
      </section>

      {requestSummary?.payNow && (
        <a href={requestSummary.payNow.url} className="home-card wide" style={{ "--c1": "#FF8A2A", "--c2": "#B8321A", textDecoration: "none" } as React.CSSProperties}>
          <span><small>{isAr ? "بانتظار الدفع" : "Ready to pay"}</small><b>{requestSummary.payNow.serviceName}</b></span>
          <i aria-hidden>{isAr ? "←" : "→"}</i>
        </a>
      )}

      {/* The concierge, wide, like the average card */}
      <Link href={`/s/${token}/concierge`} className="home-card wide" style={{ "--c1": "#FF9A8A", "--c2": "#FF4F9A" } as React.CSSProperties}>
        <span>
          <small>{aiEnabled ? (isAr ? "المساعد" : "Concierge") : (isAr ? "الفريق" : "Team")}</small>
          <b>{aiEnabled ? (isAr ? "اسأل عن أي شيء" : "Ask anything about your stay") : (isAr ? "راسل الفريق" : "Message the team")}</b>
        </span>
        <i aria-hidden>{isAr ? "←" : "→"}</i>
      </Link>

      {/* The four things guests open most */}
      <div className="home-grid">
        {tiles.map((e) => (
          <Link key={e.icon} href={e.href} className="home-card" style={{ "--c1": e.c1, "--c2": e.c2 } as React.CSSProperties}>
            <span className="home-ic"><AppIcon name={e.icon} size={18} /></span>
            <span><b>{e.title}</b><small>{e.sub}</small></span>
          </Link>
        ))}
      </div>

      {(tonightNote || tonightNoteAr) && (
        <div className="home-note"><small>{isAr ? "الليلة" : "Tonight"}</small><p>{isAr ? (tonightNoteAr ?? tonightNote) : (tonightNote ?? tonightNoteAr)}</p></div>
      )}
      {(hostPick || hostPickAr) && (
        <div className="home-note"><small>{isAr ? "نصيحة من مضيفك" : "From your host"}</small><p>{isAr ? (hostPickAr ?? hostPick) : (hostPick ?? hostPickAr)}</p></div>
      )}

      {more.length > 0 && (
        <div className="home-list">
          {more.map((m) => (
            <Link key={m.icon} href={m.href}>
              <AppIcon name={m.icon} size={18} />
              <span>{m.title}</span>
              <i aria-hidden>{isAr ? "←" : "→"}</i>
            </Link>
          ))}
        </div>
      )}

      <p className="home-legal">
        <a href={`${WEBSITE_URL}/legal#privacy`} target="_blank" rel="noopener noreferrer">
          {isAr ? "الخصوصية وكيف نتعامل مع بياناتك" : "Privacy and how we handle your data"}
        </a>
      </p>
    </main>
  );
}
