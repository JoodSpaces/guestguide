"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "all" | "eat" | "coffee" | "beach" | "activities" | "wifi" | "checkout" | "emergency";

interface Place {
  name: string;
  name_ar?: string;
  category: Category;
  description?: string;
  description_ar?: string;
  distance?: string;
  distance_ar?: string;
  rating?: number;
  address?: string;
  address_ar?: string;
  mapsUrl?: string;
  phone?: string;
  hours?: string;
  hours_ar?: string;
  isSaved?: boolean;
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────

const CAT_ICON: Record<Category, string> = {
  all:        "✦",
  eat:        "🍽",
  coffee:     "☕",
  beach:      "🏖",
  activities: "🎭",
  wifi:       "📶",
  checkout:   "🏠",
  emergency:  "🚨",
};

const CAT_EN: Record<Category, string> = {
  all:        "All",
  eat:        "Eat",
  coffee:     "Coffee",
  beach:      "Beach",
  activities: "Activities",
  wifi:       "Wi-Fi",
  checkout:   "Checkout",
  emergency:  "Emergency",
};

const CAT_AR: Record<Category, string> = {
  all:        "الكل",
  eat:        "مطاعم",
  coffee:     "قهوة",
  beach:      "شاطئ",
  activities: "أنشطة",
  wifi:       "واي فاي",
  checkout:   "مغادرة",
  emergency:  "طوارئ",
};

const CATEGORIES: Category[] = ["all", "eat", "coffee", "beach", "activities", "wifi", "checkout", "emergency"];

const ROTATING_HINTS_EN = [
  "Fresh croissants at Breeze Bakery, 3 min walk",
  "Sunset at the North Beach is at 6:42 pm today",
  "Free shuttle to the Marina leaves at 10 am & 3 pm",
  "The pool bar opens at noon",
];
const ROTATING_HINTS_AR = [
  "كرواسان طازج في مخبز بريز، 3 دقائق مشياً",
  "غروب الشمس في الشاطئ الشمالي اليوم 6:42 مساءً",
  "مكوك مجاني للمارينا يغادر 10 صباحاً و3 مساءً",
  "بار حمام السباحة يفتح عند الظهر",
];

// ─── Main component ───────────────────────────────────────────────────────────

interface DiscoverScreenProps {
  token: string;
  recs: Place[];
  locale?: string;
  propertyLat?: number | null;
  propertyLng?: number | null;
  wifiSsid?: string | null;
  checkoutTime?: string | null;
  onCallPhone?: string | null;
}

export function DiscoverScreen({ token, recs: initialPlaces }: DiscoverScreenProps) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`jood-saved-${token}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [hintIdx, setHintIdx] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const hintRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rotate hints every 8 s
  useEffect(() => {
    const hints = isAr ? ROTATING_HINTS_AR : ROTATING_HINTS_EN;
    hintRef.current = setInterval(() => setHintIdx((i) => (i + 1) % hints.length), 8000);
    return () => { if (hintRef.current) clearInterval(hintRef.current); };
  }, [isAr]);

  function toggleSaved(key: string) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      try { localStorage.setItem(`jood-saved-${token}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  const filtered = activeCategory === "all"
    ? initialPlaces
    : initialPlaces.filter((p) => p.category === activeCategory);

  const hints = isAr ? ROTATING_HINTS_AR : ROTATING_HINTS_EN;
  const hint = hints[hintIdx % hints.length];

  const placeName = (p: Place) => (isAr && p.name_ar ? p.name_ar : p.name);
  const placeDesc = (p: Place) => (isAr && p.description_ar ? p.description_ar : p.description);
  const placeAddr = (p: Place) => (isAr && p.address_ar ? p.address_ar : p.address);
  const placeDist = (p: Place) => (isAr && p.distance_ar ? p.distance_ar : p.distance);
  const placeHours = (p: Place) => (isAr && p.hours_ar ? p.hours_ar : p.hours);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div>
      {/* ── Rotating hint strip ───────────────────────────────────────── */}
      <div style={{
        padding: "12px 0 18px",
        borderBottom: "1px solid var(--jood-line)",
        marginBottom: "20px",
      }}>
        <p style={{
          fontSize: "13px",
          color: "var(--jood-mid)",
          lineHeight: 1.5,
          fontStyle: "italic",
          transition: "opacity 400ms",
        }}>
          ✦ {hint}
        </p>
      </div>

      {/* ── Category filter pills ─────────────────────────────────────── */}
      <div style={{
        display: "flex",
        gap: "8px",
        overflowX: "auto",
        paddingBottom: "4px",
        marginBottom: "24px",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      } as React.CSSProperties}>
        {CATEGORIES.map((cat) => {
          const isActive = cat === activeCategory;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontFamily: "var(--font-label)",
                fontSize: "8.5px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "6px 12px",
                borderRadius: "99px",
                border: isActive ? "1px solid var(--jood-garnet)" : "1px solid var(--jood-line)",
                backgroundColor: isActive ? "var(--jood-garnet)" : "transparent",
                color: isActive ? "#F5F4ED" : "var(--jood-mid)",
                cursor: "pointer",
                transition: "background-color 200ms, border-color 200ms, color 200ms",
              }}
            >
              <span>{CAT_ICON[cat]}</span>
              <span>{isAr ? CAT_AR[cat] : CAT_EN[cat]}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--jood-ink-faint)" }}>
          <p style={{ fontSize: "1.5rem", marginBottom: "8px" }}>✦</p>
          <p style={{ fontSize: "14px" }}>{isAr ? "لا توجد نتائج" : "Nothing here yet"}</p>
        </div>
      )}

      {/* ── Featured editorial tile ───────────────────────────────────── */}
      {featured && (
        <div style={{
          borderRadius: "20px",
          overflow: "hidden",
          marginBottom: "16px",
          background: "linear-gradient(145deg, #263028 0%, #351E1C 55%, #4A2E1E 100%)",
          position: "relative",
        }}>
          <div style={{ padding: "28px 24px 24px" }}>
            {/* Category eyebrow */}
            <p style={{
              fontFamily: "var(--font-label)",
              fontSize: "8px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(200,165,135,0.7)",
              marginBottom: "10px",
            }}>
              {isAr ? CAT_AR[featured.category] : CAT_EN[featured.category]}
            </p>

            <h2 style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem, 7vw, 2.5rem)",
              fontWeight: 400,
              fontStyle: "italic",
              color: "#F5F4ED",
              lineHeight: 1.05,
              marginBottom: "10px",
            }}>
              {placeName(featured)}
            </h2>

            {placeDesc(featured) && (
              <p style={{
                fontSize: "13.5px",
                color: "rgba(220,210,200,0.75)",
                lineHeight: 1.5,
                marginBottom: "16px",
                maxWidth: "320px",
              }}>
                {placeDesc(featured)}
              </p>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              {placeDist(featured) && (
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "rgba(200,165,135,0.8)",
                }}>
                  {placeDist(featured)}
                </span>
              )}
              {featured.rating && (
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "rgba(200,165,135,0.8)",
                }}>
                  ★ {featured.rating}
                </span>
              )}
              {placeHours(featured) && (
                <span style={{ fontSize: "12px", color: "rgba(200,165,135,0.65)" }}>
                  {placeHours(featured)}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "18px" }}>
              {featured.mapsUrl && (
                <a
                  href={featured.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "8.5px",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "#F5F4ED",
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "99px",
                    padding: "7px 14px",
                    textDecoration: "none",
                  }}
                >
                  {isAr ? "الخريطة ↗" : "Map ↗"}
                </a>
              )}
              <button
                onClick={() => toggleSaved(`${featured.name}-${featured.category}`)}
                style={{
                  fontFamily: "var(--font-label)",
                  fontSize: "8.5px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: savedIds.has(`${featured.name}-${featured.category}`) ? "#C49A82" : "rgba(200,165,135,0.6)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0",
                }}
              >
                {savedIds.has(`${featured.name}-${featured.category}`)
                  ? (isAr ? "✦ محفوظ" : "✦ Saved")
                  : (isAr ? "حفظ" : "Save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Staggered 2-col grid ──────────────────────────────────────── */}
      {rest.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
        }}>
          {rest.map((place, idx) => {
            const key = `${place.name}-${place.category}`;
            const isSaved = savedIds.has(key);
            const isTall = idx % 3 === 0;

            return (
              <div
                key={key}
                style={{
                  borderRadius: "16px",
                  border: "1px solid var(--jood-line)",
                  backgroundColor: "var(--jood-surface)",
                  padding: "18px 16px",
                  gridRow: isTall ? "span 1" : undefined,
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "6px" }}>
                  <p style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "17px",
                    fontWeight: 400,
                    color: "var(--jood-ink)",
                    lineHeight: 1.15,
                    flex: 1,
                  }}>
                    {placeName(place)}
                  </p>
                  <button
                    onClick={() => toggleSaved(key)}
                    style={{
                      flexShrink: 0,
                      fontSize: "12px",
                      color: isSaved ? "var(--jood-garnet)" : "var(--jood-ink-faint)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0",
                      lineHeight: 1,
                    }}
                    aria-label={isSaved ? "Unsave" : "Save"}
                  >
                    {isSaved ? "✦" : "✧"}
                  </button>
                </div>

                {placeDesc(place) && (
                  <p style={{
                    fontSize: "12px",
                    color: "var(--jood-mid)",
                    lineHeight: 1.5,
                  }}>
                    {placeDesc(place)}
                  </p>
                )}

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "auto" }}>
                  {placeDist(place) && (
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "var(--jood-ink-faint)",
                    }}>
                      {placeDist(place)}
                    </span>
                  )}
                  {place.rating && (
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "var(--jood-ink-faint)",
                    }}>
                      ★ {place.rating}
                    </span>
                  )}
                </div>

                {place.mapsUrl && (
                  <a
                    href={place.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: "var(--font-label)",
                      fontSize: "8px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--jood-garnet)",
                      textDecoration: "none",
                      marginTop: "4px",
                    }}
                  >
                    {isAr ? "خريطة ↗" : "Map ↗"}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
