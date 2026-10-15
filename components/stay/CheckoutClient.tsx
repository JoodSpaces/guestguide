"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DotNumber } from "@/components/stay/DotNumber";

interface Props {
  bookingId: string;
  token: string;
  checkInDate: string;
  checkInMonth: number;
  checkoutDate: string;
  checkoutTime: string;
  nightsCount: number;
  propertyName: string;
  onCallPhone: string | null;
  locale: string;
}

const CHECKLIST = {
  en: [
    "Lock the front door and leave the key inside",
    "Switch off the AC and all lights",
    "Check you haven't left anything behind",
  ],
  ar: [
    "أغلق الباب الأمامي واترك المفتاح بالداخل",
    "أوقف التكييف وجميع الأضواء",
    "تأكد أنك لم تنسَ أي شيء",
  ],
};

const SEASON_QUOTE: Record<string, { en: string; ar: string }> = {
  summer: { en: "Where the sea decides the schedule.", ar: "حيث البحر هو من يضع جدول اليوم." },
  winter: { en: "Stillness that only the off-season knows.", ar: "هدوء لا يعرفه إلا من زار في غير أوانه." },
  spring: { en: "The coast before the crowd arrives.", ar: "الساحل قبل أن يكتشفه الجميع." },
  autumn: { en: "Golden hour that lasts all day.", ar: "ساعة ذهبية تمتد طوال اليوم." },
};

function getSeason(month: number): "summer" | "winter" | "spring" | "autumn" {
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 11 || month <= 1) return "winter";
  if (month >= 2 && month <= 4) return "spring";
  return "autumn";
}

function ScrapbookCard({ propertyName, checkInDate, checkoutDate, nightsCount, checkInMonth, isAr }: {
  propertyName: string; checkInDate: string; checkoutDate: string;
  nightsCount: number; checkInMonth: number; isAr: boolean;
}) {
  const t = useTranslations("checkout");
  const season = getSeason(checkInMonth);
  const quote = SEASON_QUOTE[season];
  const nightsLabel = nightsCount === 1 ? t("nights_one") : t("nights_other", { count: nightsCount });

  return (
    <div className="home-card animate-reveal" style={{ "--c1": "#FF3FA4", "--c2": "#5B7BFF", gap: 22, padding: 20 } as React.CSSProperties}>
      <span><small style={{ textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>{t("stay_at")}</small><b style={{ fontSize: "1.5rem", marginTop: 4 }}>{propertyName}</b></span>
      <span style={{ direction: "ltr", display: "block" }}><DotNumber value={nightsCount} dot={11} gap={5} label={nightsLabel} /></span>
      <span style={{ display: "grid", gap: 4 }}>
        <small style={{ fontWeight: 700 }}>{nightsLabel}</small>
        <small>{checkInDate} → {checkoutDate}</small>
        <small style={{ marginTop: 8, fontStyle: "italic" }}>&ldquo;{isAr ? quote.ar : quote.en}&rdquo;</small>
      </span>
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }} role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" role="radio" aria-checked={value === star} aria-label={`${star}`} onClick={() => onChange(star)}
          style={{ width: 54, height: 54, borderRadius: "50%", border: 0, cursor: "pointer", fontSize: 24, lineHeight: 1,
            background: value >= star ? "#fff" : "rgba(255,255,255,.1)", color: value >= star ? "#0E0908" : "rgba(255,255,255,.6)", transition: "background .15s, transform .15s", transform: value >= star ? "scale(1.05)" : "none" }}>
          ★
        </button>
      ))}
    </div>
  );
}

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="req-dots" style={{ margin: "0 0 4px" }} aria-label={`${step} / ${total}`}>
      {Array.from({ length: total }, (_, i) => <i key={i} className={i + 1 <= step ? "on" : ""} />)}
    </div>
  );
}

function Pill({ children, onClick, disabled, soft }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; soft?: boolean }) {
  return (
    <button type="button" className="vpill" onClick={onClick} disabled={disabled}
      style={soft ? { background: "rgba(255,255,255,.1)" } : { background: "#fff", color: "#0E0908", boxShadow: "none", opacity: disabled ? 0.6 : 1 }}>
      <span>{children}</span>
      <i aria-hidden style={soft ? { background: "rgba(255,255,255,.18)", color: "#fff" } : { background: "#0E0908", color: "#fff" }}>→</i>
    </button>
  );
}

export function CheckoutClient({ bookingId, token, checkInDate, checkInMonth, checkoutDate, checkoutTime, nightsCount, propertyName, onCallPhone, locale }: Props) {
  const t = useTranslations("checkout");
  const tCommon = useTranslations("common");
  const isAr = locale === "ar";

  const [step, setStep] = useState(1);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [departed, setDeparted] = useState(false);
  const [loading, setLoading] = useState(false);
  const items = isAr ? CHECKLIST.ar : CHECKLIST.en;

  function toggleItem(i: number) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  async function submitRating() {
    if (stars === 0) { setStep(3); return; }
    setRatingSubmitted(true);
    await fetch("/api/stay/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, stars, comment: comment.trim() || undefined }),
    }).catch(() => null);
    setStep(3);
  }

  async function handleDeparted() {
    setLoading(true);
    try {
      await fetch("/api/stay/departed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    } catch { /* still proceed */ }
    setDeparted(true);
    setLoading(false);
    setStep(4);
  }

  /* ── Step 4: Thank you ─────────────────────────────────────── */
  if (step === 4 || departed) {
    const whatsappUrl = onCallPhone
      ? `https://wa.me/${onCallPhone.replace(/\D/g, "")}?text=${encodeURIComponent(isAr ? "أريد الحجز مجدداً مع JOOD" : "I'd love to book with JOOD again")}`
      : null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>
        <div className="home-card" style={{ "--c1": "#16E0B0", "--c2": "#5B7BFF", minHeight: 240, justifyContent: "flex-end", padding: 22 } as React.CSSProperties}>
          <span style={{ display: "grid", gap: 8 }}>
            <b style={{ fontSize: "1.8rem", lineHeight: 1.1 }}>{t("farewell")}</b>
            <small style={{ fontSize: ".95rem", opacity: .9, maxWidth: "30ch" }}>{t("thank_you")}</small>
          </span>
        </div>
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="home-note" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", marginTop: 0 }}>
            <span style={{ flex: 1 }}><b style={{ display: "block", fontSize: ".95rem" }}>{t("rebook")}</b><small style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>{t("whatsapp")}</small></span>
            <span aria-hidden>→</span>
          </a>
        )}
      </div>
    );
  }

  /* ── Step 1: the stay, as a card ───────────────────────────── */
  if (step === 1) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <StepDots step={1} total={3} />
        <ScrapbookCard propertyName={propertyName} checkInDate={checkInDate} checkoutDate={checkoutDate} nightsCount={nightsCount} checkInMonth={checkInMonth} isAr={isAr} />
        <div className="home-note" style={{ marginTop: 0 }}>
          <small>{t("time")}</small>
          <p style={{ fontSize: "1.5rem", fontWeight: 650, marginTop: 2 }}>{checkoutTime}</p>
          <p style={{ color: "var(--jood-ink-muted)", fontSize: ".85rem" }}>{checkoutDate}</p>
        </div>
        <Pill onClick={() => setStep(2)}>{tCommon("continue")}</Pill>
      </div>
    );
  }

  /* ── Step 2: rate your stay ────────────────────────────────── */
  if (step === 2) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <StepDots step={2} total={3} />
        <div style={{ textAlign: "center", paddingTop: 8 }}>
          <p style={{ fontSize: "1.5rem", fontWeight: 650, margin: "0 0 6px" }}>{t("rating_title")}</p>
          <p style={{ color: "var(--jood-ink-muted)", fontSize: ".92rem", margin: 0 }}>{t("rating_body")}</p>
        </div>
        <StarRating value={stars} onChange={setStars} />
        {stars > 0 && (
          <textarea
            className="svc-notes"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("comment_placeholder")}
            rows={3}
            dir={isAr ? "rtl" : "ltr"}
            style={{ margin: 0 }}
          />
        )}
        <Pill onClick={submitRating} soft={stars === 0}>{stars > 0 ? t("submit_rating") : tCommon("skip")}</Pill>
        <button type="button" onClick={() => setStep(1)} style={{ background: "none", border: 0, cursor: "pointer", color: "var(--jood-ink-muted)", fontSize: ".88rem", font: "inherit" }}>← {tCommon("back")}</button>
      </div>
    );
  }

  /* ── Step 3: the checklist, then leave ─────────────────────── */
  const all = checkedItems.size === items.length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <StepDots step={3} total={3} />
      <div className="home-note" style={{ marginTop: 0, padding: "6px 16px" }}>
        <small style={{ display: "block", padding: "12px 0 4px" }}>{t("checklist_label")}</small>
        <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((item, i) => (
            <li key={i} onClick={() => toggleItem(i)}
              style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 0", borderTop: i ? "1px solid rgba(255,255,255,.08)" : "none", cursor: "pointer", opacity: checkedItems.has(i) ? 0.55 : 1 }}>
              <span style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center",
                background: checkedItems.has(i) ? "#fff" : "transparent", boxShadow: checkedItems.has(i) ? "none" : "inset 0 0 0 1.5px rgba(255,255,255,.3)", color: "#0E0908" }}>
                {checkedItems.has(i) && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6l3 3 5-5" /></svg>}
              </span>
              <span style={{ fontSize: ".95rem", lineHeight: 1.5, textDecoration: checkedItems.has(i) ? "line-through" : "none" }}>{item}</span>
            </li>
          ))}
        </ol>
      </div>
      <Pill onClick={handleDeparted} disabled={loading} soft={!all}>{loading ? tCommon("sending") : t("departed_cta")}</Pill>
      {!all && <p style={{ color: "var(--jood-ink-muted)", fontSize: ".82rem", textAlign: "center", lineHeight: 1.5, margin: 0 }}>{t("departed_confirm")}</p>}
    </div>
  );
}
