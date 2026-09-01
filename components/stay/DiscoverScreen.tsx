"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Recommendation } from "@/app/s/[token]/discover/page";

const DiscoverMap = dynamic(
  () => import("./DiscoverMap").then((m) => m.DiscoverMap),
  { ssr: false, loading: () => <div style={{ height: "260px", background: "var(--jood-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--jood-line)" }} /> }
);

interface Props {
  recs: Recommendation[];
  locale: string;
  token: string;
  propertyLat: number | null;
  propertyLng: number | null;
  wifiSsid: string | null;
  checkoutTime: string | null;
  onCallPhone: string | null;
}

/* ─── Answer types ─────────────────────────────────────────── */
type PlacesAnswer = { kind: "places"; title: string; why?: string; places: Recommendation[]; follow?: string[] };
type InfoAnswer   = { kind: "info";   title: string; lines: string[]; link?: { label: string; href: string }; follow?: string[] };
type Answer = PlacesAnswer | InfoAnswer;

/* ─── Query engine (unchanged) ─────────────────────────────── */
function buildQuery(
  recs: Recommendation[],
  token: string,
  wifiSsid: string | null,
  checkoutTime: string | null,
  onCallPhone: string | null,
  isAr: boolean
) {
  const hour = new Date().getHours();
  const byCat = (...cats: string[]) => recs.filter((r) => cats.includes(r.category));
  const wa = onCallPhone ? `https://wa.me/${onCallPhone}` : null;

  const intents: { keys: string[]; make: () => Answer }[] = [
    {
      keys: ["beach", "شاطئ", "swim", "سباحة", "sea", "بحر", "water", "مياه", "club", "نادي بحري"],
      make: () => ({ kind: "places", title: isAr ? "الشاطئ والبحر." : "Beach & water.",
        why: hour >= 17 && hour < 20 ? (isAr ? "الساعة الذهبية الآن." : "Golden hour right now.") : hour >= 11 && hour < 15 ? (isAr ? "وقت الذروة الحرارية." : "Peak sun — go prepared.") : undefined,
        places: byCat("beach"), follow: isAr ? ["أكل", "أنشطة"] : ["eat", "activities"] }),
    },
    {
      keys: ["eat", "food", "restaurant", "dinner", "lunch", "hungry", "أكل", "مطعم", "عشاء", "غداء", "جوعان"],
      make: () => ({ kind: "places", title: isAr ? "أين تأكل." : "Where to eat.",
        why: hour >= 19 ? (isAr ? "الليلة — الأقرب والأضمن." : "Tonight — the closest, most reliable spots.") : undefined,
        places: byCat("restaurants"), follow: isAr ? ["قهوة", "شاطئ"] : ["coffee", "beach"] }),
    },
    {
      keys: ["coffee", "cafe", "breakfast", "morning", "قهوة", "كافيه", "فطور", "صباح"],
      make: () => ({ kind: "places", title: isAr ? "قهوة وإفطار." : "Coffee & breakfast.",
        why: hour < 11 ? (isAr ? "وقت مبكر — المقاعد متاحة." : "Early enough to get a good table.") : undefined,
        places: byCat("cafes"), follow: isAr ? ["شاطئ", "أكل"] : ["beach", "eat"] }),
    },
    {
      keys: ["grocery", "groceries", "market", "supermarket", "cook", "supplies", "بقالة", "سوق", "تسوق", "طهي"],
      make: () => ({ kind: "places", title: isAr ? "بقالة ومشتريات." : "Groceries & supplies.",
        places: byCat("groceries"), follow: isAr ? ["أكل", "شاطئ"] : ["eat", "beach"] }),
    },
    {
      keys: ["activit", "kite", "quad", "sport", "adventure", "نشاط", "رياضة", "كايت", "كوادات", "مغامرة"],
      make: () => ({ kind: "places", title: isAr ? "أنشطة وتجارب." : "Activities & adventures.",
        why: hour < 11 || (hour >= 17 && hour < 19) ? (isAr ? "الطقس الآن مناسب." : "Good conditions right now.") : undefined,
        places: byCat("activities"), follow: isAr ? ["شاطئ", "أكل"] : ["beach", "eat"] }),
    },
    {
      keys: ["wifi", "wi-fi", "internet", "password", "network", "واي فاي", "إنترنت", "باسورد", "كلمة المرور"],
      make: () => ({ kind: "info", title: isAr ? "الواي فاي." : "Wi-Fi.",
        lines: wifiSsid ? [isAr ? `الشبكة: ${wifiSsid}` : `Network: ${wifiSsid}`, isAr ? "كلمة المرور في صفحة الوصول." : "Password is on your Arrival page."] : [isAr ? "كلمة المرور في صفحة الوصول." : "Password is on your Arrival page."],
        link: { label: isAr ? "صفحة الوصول" : "Open Arrival", href: `/s/${token}/arrival` },
        follow: isAr ? ["رمز الباب", "مغادرة"] : ["door code", "checkout"] }),
    },
    {
      keys: ["checkout", "check out", "check-out", "leave", "leaving", "مغادرة", "وقت المغادرة", "خروج"],
      make: () => ({ kind: "info",
        title: checkoutTime ? (isAr ? `المغادرة: ${checkoutTime}.` : `Checkout by ${checkoutTime}.`) : (isAr ? "المغادرة الساعة 11:00." : "Checkout by 11:00 AM."),
        lines: [isAr ? "أطفئ المكيفات، ضع المناشف في الحمام، اسحب الباب." : "Turn off ACs, leave towels in the bathroom, pull the door shut."],
        link: { label: isAr ? "قائمة المغادرة" : "Checkout checklist", href: `/s/${token}/checkout` },
        follow: isAr ? ["واي فاي", "تواصل"] : ["wifi", "contact"] }),
    },
    {
      keys: ["kids", "children", "child", "family", "toddler", "أطفال", "عائلة", "أولاد"],
      make: () => ({ kind: "places", title: isAr ? "مع الأطفال." : "With kids.",
        why: isAr ? "الأكثر ملاءمة للعائلات." : "Family-friendly picks near the villa.",
        places: byCat("beach", "activities", "cafes").slice(0, 3), follow: isAr ? ["شاطئ", "أكل"] : ["beach", "eat"] }),
    },
    {
      keys: ["tonight", "evening", "night", "الليلة", "مساء", "ليل"],
      make: () => ({ kind: "places", title: isAr ? "هذا المساء." : "Tonight.",
        why: isAr ? "الأقرب والأكثر موثوقية ليلاً." : "Closest spots that work well for an evening.",
        places: byCat("restaurants", "cafes").slice(0, 3), follow: isAr ? ["أكل", "شاطئ"] : ["eat", "beach"] }),
    },
    {
      keys: ["arrange", "book", "reserve", "jood", "help", "contact", "ترتيب", "حجز", "جود", "مساعدة", "تواصل"],
      make: () => ({ kind: "info", title: isAr ? "جود ترتب لك." : "JOOD can arrange it.",
        lines: [isAr ? "نادي شاطئي، أنشطة، توصيل، تسوق — فقط أخبرنا." : "Beach clubs, activities, transfers, grocery runs — just ask."],
        link: wa ? { label: isAr ? "واتساب جود" : "WhatsApp JOOD", href: wa } : { label: isAr ? "اطلب مساعدة" : "Request help", href: `/s/${token}/requests` },
        follow: isAr ? ["شاطئ", "أنشطة"] : ["beach", "activities"] }),
    },
    {
      keys: ["emergency", "police", "ambulance", "hospital", "sick", "طوارئ", "شرطة", "إسعاف", "مستشفى"],
      make: () => ({ kind: "info", title: isAr ? "طوارئ." : "Emergency.",
        lines: [isAr ? "إسعاف: 123 · شرطة: 122 · حرائق: 180" : "Ambulance: 123 · Police: 122 · Fire: 180", isAr ? "أقرب مستشفى: مستشفى سيدي حنيش، ١٥ دقيقة." : "Nearest hospital: Sidi Heneish Hospital, 15 min."],
        link: wa ? { label: isAr ? "واتساب جود" : "WhatsApp JOOD", href: wa } : undefined, follow: [] }),
    },
  ];

  return function query(raw: string): Answer | null {
    if (!raw.trim()) return null;
    const q = raw.toLowerCase();
    for (const intent of intents) {
      if (intent.keys.some((k) => q.includes(k))) return intent.make();
    }
    const matched = recs.filter((r) => r.name.toLowerCase().includes(q) || q.includes(r.name.toLowerCase().split(" ")[0]));
    if (matched.length) return { kind: "places", title: matched[0].name + ".", places: matched };
    return {
      kind: "info", title: isAr ? "لم أفهمها." : "Not sure about that one.",
      lines: [isAr ? "جرب: شاطئ · أكل · قهوة · بقالة · أنشطة · واي فاي" : "Try: beach · eat · coffee · groceries · activities · wifi"],
      link: wa ? { label: isAr ? "اسأل جود مباشرة" : "Ask JOOD directly", href: wa } : undefined,
      follow: isAr ? ["شاطئ", "أكل", "أنشطة"] : ["beach", "eat", "activities"],
    };
  };
}

const EN_HINTS = ["where to eat tonight?", "best beach nearby", "coffee & breakfast", "with kids", "activities nearby", "wifi password", "checkout time"];
const AR_HINTS = ["أين نأكل الليلة؟", "أقرب شاطئ", "قهوة وإفطار", "مع الأطفال", "أنشطة قريبة", "كلمة الواي فاي", "وقت المغادرة"];

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const DirectionsIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 11 22 2 13 21 11 13 3 11"/>
  </svg>
);
const BookmarkIcon = ({ filled }: { filled: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
  </svg>
);

/* ─── Place card ─────────────────────────────────────────────── */
function PlaceCard({ rec, isAr, saved, onSave }: { rec: Recommendation; isAr: boolean; saved: boolean; onSave: () => void }) {
  const blurb = isAr ? rec.blurb_ar : rec.blurb_en;
  const mapsUrl = rec.lat && rec.lng ? `https://www.google.com/maps/dir/?api=1&destination=${rec.lat},${rec.lng}` : null;
  const priceDots = rec.price_band ? "●".repeat(rec.price_band) + "○".repeat(4 - rec.price_band) : null;

  return (
    <div className="jood-card" style={{
      background: "var(--jood-surface)",
      borderRadius: "var(--radius-lg)",
      padding: "14px 16px",
      boxShadow: "var(--shadow-card)",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      height: "100%",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 600, color: "var(--jood-ink)", lineHeight: 1.2, flex: 1 }}>
          {rec.name}
        </p>
        <button
          onClick={onSave}
          aria-label={saved ? "Remove" : "Save"}
          style={{ flexShrink: 0, width: "28px", height: "28px", borderRadius: "50%", border: `1px solid ${saved ? "var(--jood-accent)" : "var(--jood-line)"}`, background: saved ? "var(--jood-accent)" : "transparent", color: saved ? "var(--jood-ground)" : "var(--jood-ink-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 150ms" }}
        >
          <BookmarkIcon filled={saved} />
        </button>
      </div>

      <p style={{ fontSize: "12.5px", color: "var(--jood-ink-muted)", lineHeight: 1.5, flex: 1 }}>
        {blurb}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px", flexWrap: "wrap" }}>
        {priceDots && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", letterSpacing: "2px", color: "var(--jood-accent)" }}>
            {priceDots}
          </span>
        )}
        {rec.jood_can_arrange && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--jood-accent)", background: "rgba(255,96,55,0.08)", padding: "2px 6px", borderRadius: "4px" }}>
            {isAr ? "جود ترتب" : "JOOD ✓"}
          </span>
        )}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ marginInlineStart: "auto", display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--jood-ink-muted)", textDecoration: "none" }}
          >
            <DirectionsIcon />
            {isAr ? "اتجاهات" : "map"}
          </a>
        )}
      </div>
    </div>
  );
}

/* ─── Horizontal scroll strip ───────────────────────────────── */
function PlaceStrip({ items, isAr, saved, onSave }: { items: Recommendation[]; isAr: boolean; saved: string[]; onSave: (id: string) => void }) {
  if (items.length === 0) return null;

  if (items.length <= 2) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(0, 1fr))", gap: "10px" }}>
        {items.map((rec) => (
          <PlaceCard key={rec.id} rec={rec} isAr={isAr} saved={saved.includes(rec.id)} onSave={() => onSave(rec.id)} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ marginLeft: "-24px", marginRight: "-24px", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
      <div style={{ display: "flex", gap: "10px", paddingLeft: "24px", paddingRight: "24px", paddingBottom: "4px" }}>
        {items.map((rec) => (
          <div key={rec.id} style={{ flexShrink: 0, width: "clamp(180px, 52vw, 230px)" }}>
            <PlaceCard rec={rec} isAr={isAr} saved={saved.includes(rec.id)} onSave={() => onSave(rec.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────── */
export function DiscoverScreen({ recs, locale, token, propertyLat, propertyLng, wifiSsid, checkoutTime, onCallPhone }: Props) {
  const isAr = locale === "ar";
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [hintIdx, setHintIdx] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const hints = isAr ? AR_HINTS : EN_HINTS;
  const queryFn = buildQuery(recs, token, wifiSsid, checkoutTime, onCallPhone, isAr);

  useEffect(() => {
    const id = setInterval(() => setHintIdx((i) => (i + 1) % hints.length), 4000);
    return () => clearInterval(id);
  }, [hints.length]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("jood-saved-places") || "[]");
      if (Array.isArray(stored)) setSaved(stored);
    } catch {}
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem("jood-saved-places", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setAnswer(queryFn(query));
  }

  function handleChip(chip: string) {
    setQuery(chip);
    setAnswer(queryFn(chip));
  }

  function clearAnswer() {
    setQuery("");
    setAnswer(null);
    inputRef.current?.focus();
  }

  const hasRecs = recs.length > 0;
  const hasMap = propertyLat !== null && propertyLng !== null && hasRecs;
  const highlightedIds = answer?.kind === "places" ? answer.places.map((p) => p.id) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

      {/* ── Ask bar ── */}
      <div style={{ marginBottom: "28px" }}>
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--jood-surface)",
            border: "1px solid var(--jood-line)",
            borderRadius: "var(--radius-pill)",
            padding: "8px 8px 8px 18px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={hints[hintIdx]}
            dir={isAr ? "rtl" : "ltr"}
            style={{ flex: 1, minWidth: 0, background: "none", border: "none", outline: "none", fontSize: "15px", color: "var(--jood-ink)", fontFamily: "var(--font-body)" }}
          />
          {answer && (
            <button type="button" onClick={clearAnswer} aria-label="Clear" style={{ background: "var(--jood-line)", border: "none", cursor: "pointer", color: "var(--jood-ink-muted)", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <CloseIcon />
            </button>
          )}
          <button
            type="submit"
            style={{ background: "var(--jood-ink)", border: "none", borderRadius: "var(--radius-pill)", color: "var(--jood-ground)", padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, fontSize: "11.5px", fontFamily: "var(--font-label)", letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            <SendIcon />
            {!isAr && <span>Ask</span>}
          </button>
        </form>

        {/* Quick chips */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
          {(isAr ? ["شاطئ", "أكل", "قهوة", "أنشطة", "واي فاي", "مغادرة"] : ["beach", "eat", "coffee", "activities", "wifi", "checkout"]).map((chip) => (
            <button
              key={chip}
              onClick={() => handleChip(chip)}
              style={{
                background: answer && query === chip ? "var(--jood-ink)" : "var(--jood-surface)",
                border: "1px solid var(--jood-line)",
                color: answer && query === chip ? "var(--jood-ground)" : "var(--jood-ink-muted)",
                borderRadius: "var(--radius-pill)",
                fontSize: "12px",
                padding: "6px 14px",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                transition: "all 150ms",
                boxShadow: "var(--shadow-card)",
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* ── Answer panel ── */}
      {answer && (
        <div style={{ marginBottom: "32px", animation: "cc-rise 0.4s cubic-bezier(0.16,1,0.3,1) both" }}>
          <style>{`@keyframes cc-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

          {/* Why note */}
          {answer.kind === "places" && answer.why && (
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "14px", padding: "10px 14px", background: "rgba(255,96,55,0.06)", borderRadius: "var(--radius-md)", border: "1px solid rgba(255,96,55,0.15)" }}>
              <span style={{ color: "var(--jood-accent)", fontSize: "14px", flexShrink: 0, marginTop: "1px" }}>—</span>
              <p style={{ fontSize: "13.5px", color: "var(--jood-ink-muted)", lineHeight: 1.5, margin: 0 }}>{answer.why}</p>
            </div>
          )}

          {/* Answer title */}
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 5vw, 2rem)", fontWeight: 600, color: "var(--jood-ink)", lineHeight: 1.1, margin: "0 0 16px", letterSpacing: "-0.01em" }}>
            {answer.title}
          </h2>

          {/* Info lines */}
          {answer.kind === "info" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {answer.lines.map((line, i) => (
                <div key={i} style={{ display: "flex", gap: "14px", alignItems: "flex-start", padding: "12px 16px", background: "var(--jood-surface)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-card)" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--jood-accent)", flexShrink: 0, paddingTop: "2px" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: "14.5px", color: "var(--jood-ink)", lineHeight: 1.6 }}>{line}</span>
                </div>
              ))}
            </div>
          )}

          {/* Places result strip */}
          {answer.kind === "places" && answer.places.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <PlaceStrip items={answer.places} isAr={isAr} saved={saved} onSave={toggleSave} />
            </div>
          )}

          {/* Info CTA */}
          {answer.kind === "info" && answer.link && (
            <a
              href={answer.link.href}
              target={answer.link.href.startsWith("http") ? "_blank" : undefined}
              rel={answer.link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--jood-ink)", color: "var(--jood-ground)", textDecoration: "none", borderRadius: "var(--radius-pill)", fontSize: "12px", fontFamily: "var(--font-label)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "11px 20px", marginBottom: "20px" }}
            >
              {answer.link.label} ↗
            </a>
          )}

          {/* Follow-up chips */}
          {answer.follow && answer.follow.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-ghost)", marginInlineEnd: "2px" }}>
                {isAr ? "ثم" : "Also"}
              </span>
              {answer.follow.map((chip) => (
                <button key={chip} onClick={() => handleChip(chip)} style={{ background: "none", border: "1px solid var(--jood-line)", color: "var(--jood-ink-muted)", borderRadius: "var(--radius-pill)", fontSize: "12px", padding: "5px 12px", cursor: "pointer", fontFamily: "var(--font-body)" }}>
                  {chip}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Map toggle ── */}
      {hasMap && !answer && (
        <div style={{ marginBottom: "24px" }}>
          <button
            onClick={() => setShowMap((v) => !v)}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: showMap ? "var(--jood-ink)" : "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", color: showMap ? "var(--jood-ground)" : "var(--jood-ink-muted)", fontSize: "12px", fontFamily: "var(--font-label)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 16px", cursor: "pointer", boxShadow: "var(--shadow-card)", transition: "all 180ms" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            {showMap ? (isAr ? "إخفاء الخريطة" : "Hide map") : (isAr ? "عرض الخريطة" : "Show map")}
          </button>
          {showMap && (
            <div style={{ marginTop: "12px" }}>
              <DiscoverMap recs={recs.filter((r) => r.lat && r.lng)} highlighted={highlightedIds} propertyLat={propertyLat!} propertyLng={propertyLng!} onSelect={() => {}} />
            </div>
          )}
        </div>
      )}

      {/* ── Saved list ── */}
      {saved.length > 0 && !answer && (
        <div style={{ marginBottom: "32px", padding: "16px 18px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)", background: "var(--jood-surface)", boxShadow: "var(--shadow-card)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--jood-ink-muted)", margin: 0 }}>
              {isAr ? "قائمتك" : "Your list"} · {saved.length}
            </p>
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=current+location&destination=${recs.find(r => r.id === saved[saved.length - 1])?.lat},${recs.find(r => r.id === saved[saved.length - 1])?.lng}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--jood-accent)", textDecoration: "none" }}
            >
              {isAr ? "افتح المسار" : "Open route"} ↗
            </a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {saved.map((id, i) => {
              const rec = recs.find((r) => r.id === id);
              if (!rec) return null;
              return (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "9px 0", borderBottom: i < saved.length - 1 ? "1px solid var(--jood-line)" : undefined }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--jood-accent)", flexShrink: 0, width: "20px" }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ flex: 1, fontSize: "14px", color: "var(--jood-ink)", fontFamily: "var(--font-body)" }}>{rec.name}</span>
                  <button onClick={() => toggleSave(id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--jood-ink-faint)", padding: "4px", display: "flex" }}>
                    <CloseIcon />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── All places ── */}
      {hasRecs && !answer && <AllPlaces recs={recs} isAr={isAr} saved={saved} onSave={toggleSave} />}

      {!hasRecs && !answer && (
        <div style={{ padding: "clamp(28px,5vw,44px)", background: "var(--jood-surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)" }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 600, color: "var(--jood-ink)", margin: "0 0 8px" }}>
            {isAr ? "نختار لك أفضل الأماكن." : "Curating the local list."}
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--jood-ink-muted)", lineHeight: 1.6, margin: 0 }}>
            {isAr ? "اسألنا عبر واتساب في أي وقت." : "Ask JOOD anything via the help tab in the meantime."}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── All places grouped by category ───────────────────────── */
const CAT_ORDER = ["restaurants", "cafes", "beach", "groceries", "activities", "nightlife", "shopping", "emergency"];
const CAT_LABEL: Record<string, { en: string; ar: string }> = {
  restaurants: { en: "Restaurants",    ar: "مطاعم"    },
  cafes:       { en: "Cafes",          ar: "مقاهي"    },
  beach:       { en: "Beach & Clubs",  ar: "شاطئ ونوادي" },
  groceries:   { en: "Groceries",      ar: "بقالة"    },
  activities:  { en: "Activities",     ar: "أنشطة"    },
  nightlife:   { en: "Nightlife",      ar: "حياة ليلية" },
  shopping:    { en: "Shopping",       ar: "تسوق"     },
  emergency:   { en: "Emergency",      ar: "طوارئ"    },
};

function AllPlaces({ recs, isAr, saved, onSave }: { recs: Recommendation[]; isAr: boolean; saved: string[]; onSave: (id: string) => void }) {
  const cats = CAT_ORDER.filter((c) => recs.some((r) => r.category === c));
  const grouped = cats.map((cat) => ({ cat, items: recs.filter((r) => r.category === cat) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
      {grouped.map(({ cat, items }) => (
        <section key={cat}>
          {/* Category header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <p style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, color: "var(--jood-ink)", margin: 0 }}>
                {CAT_LABEL[cat] ? (isAr ? CAT_LABEL[cat].ar : CAT_LABEL[cat].en) : cat}
              </p>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--jood-accent)", background: "rgba(255,96,55,0.08)", padding: "2px 6px", borderRadius: "4px" }}>
                {items.length}
              </span>
            </div>
          </div>
          <PlaceStrip items={items} isAr={isAr} saved={saved} onSave={onSave} />
        </section>
      ))}
    </div>
  );
}
