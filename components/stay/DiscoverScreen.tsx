"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { AppIcon } from "@/components/ui/AppIcon";

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterCategory = "all" | "eat" | "coffee" | "beach" | "activities" | "wifi" | "checkout" | "emergency";

interface Place {
  name: string;
  name_ar?: string;
  category: string;
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

// Discover categories -> line icon names (see components/ui/AppIcon)
const CAT_ICON: Record<string, string> = {
  all: "all", eat: "food", coffee: "coffee", beach: "beach", activities: "activities", wifi: "wifi", checkout: "checkout", emergency: "emergency",
};

const CAT_EN: Record<string, string> = {
  all:        "All",
  eat:        "Eat",
  coffee:     "Coffee",
  beach:      "Beach",
  activities: "Activities",
  wifi:       "Wi-Fi",
  checkout:   "Checkout",
  emergency:  "Emergency",
};

const CAT_AR: Record<string, string> = {
  all:        "الكل",
  eat:        "مطاعم",
  coffee:     "قهوة",
  beach:      "شاطئ",
  activities: "أنشطة",
  wifi:       "واي فاي",
  checkout:   "مغادرة",
  emergency:  "طوارئ",
};

const CATEGORIES: FilterCategory[] = ["all", "eat", "coffee", "beach", "activities", "wifi", "checkout", "emergency"];

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

  const [activeCategory, setActiveCategory] = useState<FilterCategory>("all");
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

  const GLOW: Record<string, [string, string]> = {
    eat: ["#FF8A2A", "#B8321A"], coffee: ["#FFD35B", "#B8721A"], beach: ["#16E0B0", "#0A6E6A"], activities: ["#5B7BFF", "#2B2FB0"],
    wifi: ["#9BD6E0", "#2B6C86"], checkout: ["#FF3FA4", "#7A1FA8"], emergency: ["#FF5252", "#8A1414"],
  };
  const glow = (cat: string) => {
    const [c1, c2] = GLOW[cat] ?? ["#9BD6E0", "#2B6C86"];
    return { "--c1": c1, "--c2": c2 } as React.CSSProperties;
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <div className="home-note" style={{ marginTop: 0, marginBottom: 14 }}>
        <small>{isAr ? "اليوم" : "Today"}</small>
        <p style={{ fontSize: ".92rem" }}>{hint}</p>
      </div>

      <div className="svc-pills" role="tablist" aria-label={isAr ? "الفئة" : "Category"}>
        {CATEGORIES.map((cat) => (
          <button key={cat} type="button" role="tab" aria-selected={cat === activeCategory} onClick={() => setActiveCategory(cat)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <AppIcon name={CAT_ICON[cat]} size={14} />
            <span>{isAr ? CAT_AR[cat] : CAT_EN[cat]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="home-note" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--jood-ink-muted)", fontSize: 14 }}>{isAr ? "لا توجد نتائج" : "Nothing here yet"}</p>
        </div>
      )}

      {/* The first place, big */}
      {featured && (
        <div className="home-card" style={{ ...glow(featured.category), minHeight: 230, marginBottom: 10, gap: 22 }}>
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="home-ic"><AppIcon name={CAT_ICON[featured.category] ?? "discover"} size={18} /></span>
            <button
              type="button"
              onClick={() => toggleSaved(`${featured.name}-${featured.category}`)}
              aria-label={savedIds.has(`${featured.name}-${featured.category}`) ? "Unsave" : "Save"}
              className="home-ic" style={{ border: 0, cursor: "pointer", color: "#fff" }}
            >
              <AppIcon name="save" size={16} filled={savedIds.has(`${featured.name}-${featured.category}`)} />
            </button>
          </span>
          <span style={{ display: "grid", gap: 10 }}>
            <small style={{ textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>{isAr ? CAT_AR[featured.category] : CAT_EN[featured.category]}</small>
            <b style={{ fontSize: "1.6rem", lineHeight: 1.15 }}>{placeName(featured)}</b>
            {placeDesc(featured) && <small style={{ fontSize: ".9rem", opacity: .88 }}>{placeDesc(featured)}</small>}
            <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {placeDist(featured) && <span className="dsc-chip">{placeDist(featured)}</span>}
              {featured.rating && <span className="dsc-chip">★ {featured.rating}</span>}
              {placeHours(featured) && <span className="dsc-chip">{placeHours(featured)}</span>}
              {featured.mapsUrl && <a href={featured.mapsUrl} target="_blank" rel="noopener noreferrer" className="dsc-chip strong">{isAr ? "الخريطة ↗" : "Map ↗"}</a>}
            </span>
          </span>
        </div>
      )}

      {/* The rest: compact glowing tiles */}
      {rest.length > 0 && (
        <div className="home-grid">
          {rest.map((place) => {
            const key = `${place.name}-${place.category}`;
            const isSaved = savedIds.has(key);
            return (
              <div key={key} className="home-card" style={{ ...glow(place.category), minHeight: 160 }}>
                <span style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span className="home-ic"><AppIcon name={CAT_ICON[place.category] ?? "discover"} size={16} /></span>
                  <button type="button" onClick={() => toggleSaved(key)} aria-label={isSaved ? "Unsave" : "Save"} style={{ border: 0, background: "rgba(255,255,255,.14)", width: 32, height: 32, borderRadius: 11, display: "grid", placeItems: "center", color: "#fff", cursor: "pointer" }}>
                    <AppIcon name="save" size={15} filled={isSaved} />
                  </button>
                </span>
                <span style={{ display: "grid", gap: 6 }}>
                  <b>{placeName(place)}</b>
                  {placeDesc(place) && <small style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{placeDesc(place)}</small>}
                  <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {placeDist(place) && <span className="dsc-chip">{placeDist(place)}</span>}
                    {place.rating && <span className="dsc-chip">★ {place.rating}</span>}
                    {place.mapsUrl && <a href={place.mapsUrl} target="_blank" rel="noopener noreferrer" className="dsc-chip strong">{isAr ? "خريطة ↗" : "Map ↗"}</a>}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
