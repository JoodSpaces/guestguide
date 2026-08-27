"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
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

/* ─── Query engine ─────────────────────────────────────────── */
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
      make: () => ({
        kind: "places",
        title: isAr ? "الشاطئ والبحر." : "Beach & water.",
        why: hour >= 17 && hour < 20
          ? (isAr ? "الساعة الذهبية الآن — أفضل وقت للشاطئ." : "Golden hour right now — best time for the water.")
          : hour >= 11 && hour < 15
          ? (isAr ? "وقت الذروة الحرارية — أخذ احتياطاتك." : "Peak sun — go prepared.")
          : undefined,
        places: byCat("beach"),
        follow: isAr ? ["أكل", "أنشطة"] : ["eat", "activities"],
      }),
    },
    {
      keys: ["eat", "food", "restaurant", "dinner", "lunch", "hungry", "أكل", "مطعم", "عشاء", "غداء", "جوعان"],
      make: () => ({
        kind: "places",
        title: isAr ? "أين تأكل." : "Where to eat.",
        why: hour >= 19
          ? (isAr ? "الليلة — الأماكن الأقرب والأضمن حجزاً." : "Tonight — the closest, most reliable spots.")
          : undefined,
        places: byCat("restaurants"),
        follow: isAr ? ["قهوة", "شاطئ"] : ["coffee", "beach"],
      }),
    },
    {
      keys: ["coffee", "cafe", "breakfast", "morning", "قهوة", "كافيه", "فطور", "صباح"],
      make: () => ({
        kind: "places",
        title: isAr ? "قهوة وإفطار." : "Coffee & breakfast.",
        why: hour < 11
          ? (isAr ? "وقت مبكر — المقاعد لا تزال متاحة." : "Early enough to get a good table.")
          : undefined,
        places: byCat("cafes"),
        follow: isAr ? ["شاطئ", "أكل"] : ["beach", "eat"],
      }),
    },
    {
      keys: ["grocery", "groceries", "market", "supermarket", "cook", "supplies", "بقالة", "سوق", "تسوق", "طهي"],
      make: () => ({
        kind: "places",
        title: isAr ? "بقالة ومشتريات." : "Groceries & supplies.",
        places: byCat("groceries"),
        follow: isAr ? ["أكل", "شاطئ"] : ["eat", "beach"],
      }),
    },
    {
      keys: ["activit", "kite", "quad", "sport", "adventure", "نشاط", "رياضة", "كايت", "كوادات", "مغامرة"],
      make: () => ({
        kind: "places",
        title: isAr ? "أنشطة وتجارب." : "Activities & adventures.",
        why: hour < 11 || (hour >= 17 && hour < 19)
          ? (isAr ? "الطقس الآن مناسب — الأفضل في الصباح أو بعد الرابعة." : "Good conditions right now.")
          : undefined,
        places: byCat("activities"),
        follow: isAr ? ["شاطئ", "أكل"] : ["beach", "eat"],
      }),
    },
    {
      keys: ["wifi", "wi-fi", "internet", "password", "network", "واي فاي", "إنترنت", "باسورد", "كلمة المرور"],
      make: () => ({
        kind: "info",
        title: isAr ? "الواي فاي." : "Wi-Fi.",
        lines: wifiSsid
          ? [isAr ? `الشبكة: ${wifiSsid}` : `Network: ${wifiSsid}`, isAr ? "كلمة المرور في صفحة الوصول." : "Password is on your Arrival page."]
          : [isAr ? "كلمة المرور موجودة في صفحة الوصول." : "Password is on your Arrival page."],
        link: { label: isAr ? "صفحة الوصول" : "Open Arrival", href: `/s/${token}/arrival` },
        follow: isAr ? ["رمز الباب", "مغادرة"] : ["door code", "checkout"],
      }),
    },
    {
      keys: ["checkout", "check out", "check-out", "leave", "leaving", "مغادرة", "وقت المغادرة", "خروج"],
      make: () => ({
        kind: "info",
        title: checkoutTime
          ? (isAr ? `المغادرة: ${checkoutTime}.` : `Checkout by ${checkoutTime}.`)
          : (isAr ? "المغادرة الساعة 11:00." : "Checkout by 11:00 AM."),
        lines: [isAr
          ? "أطفئ المكيفات، ضع المناشف في الحمام، اسحب الباب خلفك."
          : "Turn off ACs, leave towels in the bathroom, pull the door shut behind you."],
        link: { label: isAr ? "قائمة المغادرة" : "Checkout checklist", href: `/s/${token}/checkout` },
        follow: isAr ? ["واي فاي", "تواصل"] : ["wifi", "contact"],
      }),
    },
    {
      keys: ["kids", "children", "child", "family", "toddler", "أطفال", "عائلة", "أولاد"],
      make: () => ({
        kind: "places",
        title: isAr ? "مع الأطفال." : "With kids.",
        why: isAr ? "الأماكن الأكثر ملاءمة للعائلات." : "Family-friendly picks near the villa.",
        places: byCat("beach", "activities", "cafes").slice(0, 3),
        follow: isAr ? ["شاطئ", "أكل"] : ["beach", "eat"],
      }),
    },
    {
      keys: ["tonight", "evening", "night", "الليلة", "مساء", "ليل"],
      make: () => ({
        kind: "places",
        title: isAr ? "هذا المساء." : "Tonight.",
        why: isAr ? "الأقرب والأكثر موثوقية ليلاً." : "Closest spots that work well for an evening.",
        places: byCat("restaurants", "cafes").slice(0, 3),
        follow: isAr ? ["أكل", "شاطئ"] : ["eat", "beach"],
      }),
    },
    {
      keys: ["arrange", "book", "reserve", "jood", "help", "contact", "ترتيب", "حجز", "جود", "مساعدة", "تواصل"],
      make: () => ({
        kind: "info",
        title: isAr ? "جود ترتب لك." : "JOOD can arrange it.",
        lines: [
          isAr ? "نادي شاطئي، أنشطة، توصيل، تسوق — فقط أخبرنا." : "Beach club reservations, activities, transfers, grocery runs — just ask.",
        ],
        link: wa
          ? { label: isAr ? "واتساب جود" : "WhatsApp JOOD", href: wa }
          : { label: isAr ? "اطلب مساعدة" : "Request help", href: `/s/${token}/requests` },
        follow: isAr ? ["شاطئ", "أنشطة"] : ["beach", "activities"],
      }),
    },
    {
      keys: ["emergency", "police", "ambulance", "hospital", "sick", "طوارئ", "شرطة", "إسعاف", "مستشفى"],
      make: () => ({
        kind: "info",
        title: isAr ? "طوارئ." : "Emergency.",
        lines: [
          isAr ? "إسعاف: 123 · شرطة: 122 · حرائق: 180" : "Ambulance: 123 · Police: 122 · Fire: 180",
          isAr ? "أقرب مستشفى: مستشفى سيدي حنيش، ١٥ دقيقة." : "Nearest hospital: Sidi Heneish Hospital, 15 min away.",
        ],
        link: wa ? { label: isAr ? "واتساب جود" : "WhatsApp JOOD", href: wa } : undefined,
        follow: [],
      }),
    },
  ];

  return function query(raw: string): Answer | null {
    if (!raw.trim()) return null;
    const q = raw.toLowerCase();

    for (const intent of intents) {
      if (intent.keys.some((k) => q.includes(k))) return intent.make();
    }

    // Fuzzy place name match
    const matched = recs.filter(
      (r) => r.name.toLowerCase().includes(q) || q.includes(r.name.toLowerCase().split(" ")[0])
    );
    if (matched.length) {
      return { kind: "places", title: matched[0].name + ".", places: matched };
    }

    return {
      kind: "info",
      title: isAr ? "لم أفهمها." : "Not sure about that one.",
      lines: [isAr
        ? "جرب: شاطئ · أكل · قهوة · بقالة · أنشطة · واي فاي"
        : "Try: beach · eat · coffee · groceries · activities · wifi"],
      link: wa ? { label: isAr ? "اسأل جود مباشرة" : "Ask JOOD directly", href: wa } : undefined,
      follow: isAr ? ["شاطئ", "أكل", "أنشطة"] : ["beach", "eat", "activities"],
    };
  };
}

/* ─── Cycling hints ────────────────────────────────────────── */
const EN_HINTS = ["where to eat tonight?", "best beach nearby", "coffee in the morning", "with kids", "JOOD can arrange...", "groceries & supplies", "activities nearby", "checkout time"];
const AR_HINTS = ["أين نأكل الليلة؟", "أقرب شاطئ", "قهوة في الصباح", "مع الأطفال", "جود ترتب لك...", "بقالة ومشتريات", "أنشطة قريبة", "وقت المغادرة"];

/* ─── Icons ────────────────────────────────────────────────── */
const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
  </svg>
);
const MapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
);
const SaveIcon = ({ saved }: { saved: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

/* ─── Main component ───────────────────────────────────────── */
export function DiscoverScreen({
  recs, locale, token,
  propertyLat, propertyLng,
  wifiSsid, checkoutTime, onCallPhone,
}: Props) {
  const isAr = locale === "ar";
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [hintIdx, setHintIdx] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const hints = isAr ? AR_HINTS : EN_HINTS;
  const queryFn = buildQuery(recs, token, wifiSsid, checkoutTime, onCallPhone, isAr);

  useEffect(() => {
    const id = setInterval(() => setHintIdx((i) => (i + 1) % hints.length), 4200);
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
    setSelectedId(null);
  }

  function handleChip(chip: string) {
    setQuery(chip);
    setAnswer(queryFn(chip));
    setSelectedId(null);
  }

  function clearAnswer() {
    setQuery("");
    setAnswer(null);
    setSelectedId(null);
    inputRef.current?.focus();
  }

  const hasRecs = recs.length > 0;
  const hasMap = propertyLat !== null && propertyLng !== null && hasRecs;
  const highlightedIds = answer?.kind === "places" ? answer.places.map((p) => p.id) : [];

  const selectedRec = selectedId ? recs.find((r) => r.id === selectedId) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

      {/* ── Ask bar ── */}
      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "12px" }}>
          {isAr ? "اسأل عن أي شيء" : "Ask about anything"}
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "center", gap: "10px", border: "1.5px solid var(--jood-ink)", borderRadius: "var(--radius-pill)", padding: "10px 10px 10px 18px", backgroundColor: "var(--jood-surface)" }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={hints[hintIdx]}
            dir={isAr ? "rtl" : "ltr"}
            style={{ flex: 1, minWidth: 0, background: "none", border: "none", outline: "none", fontSize: "15px", color: "var(--jood-ink)", fontFamily: "var(--font-body)" }}
          />
          {answer && (
            <button type="button" onClick={clearAnswer} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--jood-ink-muted)", padding: "4px", display: "flex", alignItems: "center" }}>
              <CloseIcon />
            </button>
          )}
          <button
            type="submit"
            style={{ background: "var(--jood-ink)", border: "none", borderRadius: "var(--radius-pill)", color: "var(--jood-ground)", padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, fontSize: "12px", fontFamily: "var(--font-label)", letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            <SendIcon />
            {!isAr && <span>Ask</span>}
          </button>
        </form>

        {/* Quick chips */}
        <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginTop: "10px" }}>
          {(isAr
            ? ["شاطئ", "أكل", "قهوة", "أنشطة", "واي فاي", "مغادرة"]
            : ["beach", "eat", "coffee", "activities", "wifi", "checkout"]
          ).map((chip) => (
            <button
              key={chip}
              onClick={() => handleChip(chip)}
              style={{ background: "none", border: "1px solid var(--jood-line)", color: "var(--jood-ink-muted)", borderRadius: "var(--radius-pill)", fontSize: "12px", padding: "6px 12px", cursor: "pointer", fontFamily: "var(--font-body)", transition: "border-color 150ms, color 150ms" }}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* ── Answer panel ── */}
      {answer && (
        <div style={{ marginBottom: "28px", animation: "cc-rise 0.35s cubic-bezier(0.16,1,0.3,1) both" }}>
          <style>{`@keyframes cc-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

          {/* Why line */}
          {answer.kind === "places" && answer.why && (
            <p style={{ margin: "0 0 12px", fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "16px", lineHeight: 1.5, color: "rgba(115,54,53,0.9)" }}>
              <span style={{ fontStyle: "normal", color: "var(--jood-accent)", marginInlineEnd: "8px" }}>—</span>
              {answer.why}
            </p>
          )}

          {/* Title */}
          <h2 className="font-display" style={{ fontSize: "clamp(1.4rem, 4vw, 1.8rem)", color: "var(--jood-ink)", lineHeight: 1.1, margin: "0 0 16px" }}>
            {answer.title}
          </h2>

          {/* Info lines */}
          {answer.kind === "info" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {answer.lines.map((line, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--jood-accent)", flexShrink: 0, paddingTop: "3px" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: "15px", color: "var(--jood-ink-muted)", lineHeight: 1.6 }}>{line}</span>
                </div>
              ))}
            </div>
          )}

          {/* Places list in answer */}
          {answer.kind === "places" && answer.places.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid var(--jood-line)", marginBottom: "16px" }}>
              {answer.places.map((rec, i) => (
                <PlaceRow
                  key={rec.id}
                  rec={rec}
                  idx={i}
                  isAr={isAr}
                  saved={saved.includes(rec.id)}
                  selected={selectedId === rec.id}
                  onSave={() => toggleSave(rec.id)}
                  onSelect={() => setSelectedId(selectedId === rec.id ? null : rec.id)}
                />
              ))}
            </div>
          )}

          {/* Link button */}
          {answer.kind === "info" && answer.link && (
            <a
              href={answer.link.href}
              target={answer.link.href.startsWith("http") ? "_blank" : undefined}
              rel={answer.link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--jood-accent)", color: "var(--jood-ground)", textDecoration: "none", borderRadius: "var(--radius-pill)", fontSize: "12.5px", fontFamily: "var(--font-label)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 18px", marginBottom: "16px" }}
            >
              {answer.link.label} ↗
            </a>
          )}

          {/* Follow-up chips */}
          {answer.follow && answer.follow.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-ghost)" }}>
                {isAr ? "ثم" : "Then"}
              </span>
              {answer.follow.map((chip) => (
                <button key={chip} onClick={() => handleChip(chip)} style={{ background: "none", border: "1px solid rgba(115,54,53,0.3)", color: "#733635", borderRadius: "var(--radius-pill)", fontSize: "12px", padding: "5px 11px", cursor: "pointer", fontFamily: "var(--font-body)", transition: "border-color 150ms, color 150ms" }}>
                  {chip}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Map toggle ── */}
      {hasMap && (
        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={() => setShowMap((v) => !v)}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", background: "transparent", color: "var(--jood-ink-muted)", fontSize: "12px", fontFamily: "var(--font-label)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "7px 14px", cursor: "pointer" }}
          >
            <MapIcon />
            {showMap ? (isAr ? "إخفاء الخريطة" : "Hide map") : (isAr ? "عرض الخريطة" : "Show map")}
          </button>
          {showMap && (
            <div style={{ marginTop: "12px" }}>
              <DiscoverMap
                recs={recs.filter((r) => r.lat && r.lng)}
                highlighted={highlightedIds}
                propertyLat={propertyLat!}
                propertyLng={propertyLng!}
                onSelect={setSelectedId}
              />
              {selectedRec && (
                <div style={{ marginTop: "12px", padding: "16px", background: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                    <p className="font-display" style={{ fontSize: "1.3rem", color: "var(--jood-ink)", margin: 0, lineHeight: 1.2 }}>{selectedRec.name}</p>
                    <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--jood-ink-muted)", padding: "2px", flexShrink: 0 }}>
                      <CloseIcon />
                    </button>
                  </div>
                  <p style={{ fontSize: "14.5px", color: "var(--jood-ink-muted)", lineHeight: 1.6, margin: "0 0 12px" }}>
                    {isAr ? selectedRec.blurb_ar : selectedRec.blurb_en}
                  </p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {selectedRec.lat && selectedRec.lng && (
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedRec.lat},${selectedRec.lng}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", textDecoration: "none", color: "var(--jood-ink-muted)", fontSize: "12px", fontFamily: "var(--font-label)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "7px 14px" }}>
                        {isAr ? "الاتجاهات" : "Directions"} ↗
                      </a>
                    )}
                    <button onClick={() => toggleSave(selectedRec.id)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", border: `1px solid ${saved.includes(selectedRec.id) ? "var(--jood-accent)" : "var(--jood-line)"}`, borderRadius: "var(--radius-pill)", background: saved.includes(selectedRec.id) ? "var(--jood-accent)" : "transparent", color: saved.includes(selectedRec.id) ? "var(--jood-ground)" : "var(--jood-ink-muted)", fontSize: "12px", fontFamily: "var(--font-label)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "7px 14px", cursor: "pointer" }}>
                      <SaveIcon saved={saved.includes(selectedRec.id)} />
                      {saved.includes(selectedRec.id) ? (isAr ? "محفوظ" : "Saved") : (isAr ? "حفظ" : "Save")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Saved list ── */}
      {saved.length > 0 && (
        <div style={{ marginBottom: "28px", padding: "16px 20px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)", background: "var(--jood-surface)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--jood-ink-muted)", margin: 0 }}>
              {isAr ? "قائمتك" : "Your list"}
            </p>
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=current+location&destination=${recs.find(r => r.id === saved[saved.length - 1])?.lat},${recs.find(r => r.id === saved[saved.length - 1])?.lng}&waypoints=${saved.slice(0, -1).map(id => { const r = recs.find(x => x.id === id); return r ? `${r.lat},${r.lng}` : ""; }).filter(Boolean).join("|")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--jood-accent)", textDecoration: "none" }}
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
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--jood-accent)", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ flex: 1, fontSize: "14.5px", color: "var(--jood-ink)" }}>{rec.name}</span>
                  <button onClick={() => toggleSave(id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--jood-ink-faint)", fontSize: "14px", padding: "2px 4px" }}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Divider ── */}
      {!answer && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "20px" }}>
          {isAr ? "جميع الأماكن" : "All places"}
        </p>
      )}

      {/* ── Full place list ── */}
      {hasRecs && !answer && <AllPlaces recs={recs} isAr={isAr} saved={saved} onSave={toggleSave} />}

      {!hasRecs && !answer && (
        <div style={{ padding: "clamp(28px,5vw,44px)", background: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)" }}>
          <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "1.2rem", color: "var(--jood-ink-muted)", margin: 0, lineHeight: 1.5 }}>
            {isAr ? "نختار لك أفضل الأماكن." : "Curating the local list for you."}
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--jood-ink-muted)", marginTop: "8px", lineHeight: 1.6 }}>
            {isAr ? "اسألنا عبر واتساب في أي وقت." : "Ask JOOD anything via the help button in the meantime."}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Place row ─────────────────────────────────────────────── */
function PlaceRow({ rec, idx, isAr, saved, selected, onSave, onSelect }: {
  rec: Recommendation; idx: number; isAr: boolean; saved: boolean; selected: boolean;
  onSave: () => void; onSelect: () => void;
}) {
  const blurb = isAr ? rec.blurb_ar : rec.blurb_en;
  const mapsUrl = rec.lat && rec.lng ? `https://www.google.com/maps/dir/?api=1&destination=${rec.lat},${rec.lng}` : null;

  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "14px 0", borderBottom: "1px solid var(--jood-line)", background: selected ? "rgba(255,96,55,0.04)" : "transparent" }}>
      <button
        onClick={onSelect}
        style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-start", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: isAr ? "right" : "left", color: "var(--jood-ink)" }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "9px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", color: selected ? "var(--jood-accent)" : "var(--jood-ink-faint)" }}>
            {String(idx + 1).padStart(2, "0")}
          </span>
          <span className="font-display" style={{ fontSize: "clamp(1.1rem, 3vw, 1.3rem)", lineHeight: 1.15 }}>{rec.name}</span>
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--jood-accent)", textDecoration: "none" }}>
              {isAr ? "الاتجاهات" : "map"} ↗
            </a>
          )}
          {rec.jood_can_arrange && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--jood-accent)" }}>
              {isAr ? "جود ترتب" : "JOOD arranges"}
            </span>
          )}
        </div>
        <span style={{ fontSize: "14.5px", color: "var(--jood-ink-muted)", lineHeight: 1.65, textWrap: "pretty" as any }}>{blurb}</span>
      </button>
      <button onClick={onSave} style={{ flexShrink: 0, display: "grid", placeItems: "center", width: "32px", height: "32px", borderRadius: "50%", border: `1px solid ${saved ? "var(--jood-accent)" : "var(--jood-line)"}`, background: saved ? "var(--jood-accent)" : "transparent", color: saved ? "var(--jood-ground)" : "var(--jood-ink-muted)", cursor: "pointer", transition: "all 150ms" }}>
        <SaveIcon saved={saved} />
      </button>
    </div>
  );
}

/* ─── Full place list grouped by category ───────────────────── */
const CAT_ORDER = ["restaurants", "cafes", "beach", "groceries", "activities", "nightlife", "shopping", "emergency"];

function AllPlaces({ recs, isAr, saved, onSave }: { recs: Recommendation[]; isAr: boolean; saved: string[]; onSave: (id: string) => void }) {
  const catLabel: Record<string, { en: string; ar: string }> = {
    restaurants: { en: "Restaurants", ar: "مطاعم" },
    cafes: { en: "Cafes", ar: "مقاهي" },
    beach: { en: "Beach & Clubs", ar: "شاطئ ونوادي" },
    groceries: { en: "Groceries", ar: "بقالة" },
    activities: { en: "Activities", ar: "أنشطة" },
    nightlife: { en: "Nightlife", ar: "حياة ليلية" },
    shopping: { en: "Shopping", ar: "تسوق" },
    emergency: { en: "Emergency", ar: "طوارئ" },
  };

  const cats = CAT_ORDER.filter((c) => recs.some((r) => r.category === c));
  const grouped = cats.map((cat) => ({ cat, items: recs.filter((r) => r.category === cat) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {grouped.map(({ cat, items }) => (
        <section key={cat}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "2px solid var(--jood-ink)", paddingTop: "12px", marginBottom: "0" }}>
            <p className="label-eyebrow" style={{ color: "var(--jood-ink)", letterSpacing: "0.16em" }}>
              {catLabel[cat] ? (isAr ? catLabel[cat].ar : catLabel[cat].en) : cat}
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--jood-accent)" }}>{items.length}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {items.map((rec, idx) => (
              <PlaceRow
                key={rec.id}
                rec={rec}
                idx={idx}
                isAr={isAr}
                saved={saved.includes(rec.id)}
                selected={false}
                onSave={() => onSave(rec.id)}
                onSelect={() => {}}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
