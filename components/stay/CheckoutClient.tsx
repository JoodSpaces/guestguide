"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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
  const season = getSeason(checkInMonth);
  const quote = SEASON_QUOTE[season];
  const nightsLabel = isAr
    ? `${nightsCount} ${nightsCount === 1 ? "ليلة" : "ليالٍ"}`
    : `${nightsCount} ${nightsCount === 1 ? "night" : "nights"}`;

  return (
    <div className="animate-reveal" style={{ backgroundColor: "#351E1C", borderRadius: "var(--radius-lg)", padding: "clamp(28px, 5vw, 44px)", position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", insetInlineEnd: "-12px", top: "-16px", fontFamily: "var(--font-display)", fontSize: "clamp(7rem, 22vw, 11rem)", color: "rgba(245,244,237,0.04)", lineHeight: 1, userSelect: "none", pointerEvents: "none" }}>
        {nightsCount}
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,244,237,0.35)", marginBottom: "20px" }}>
        {isAr ? "إقامتك في" : "YOUR STAY AT"}
      </p>
      <p className="font-display" style={{ fontSize: "clamp(1.6rem, 5vw, 2.6rem)", fontWeight: 600, color: "#F5F4ED", lineHeight: 1.1, marginBottom: "28px" }}>
        {propertyName}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "24px" }}>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", color: "rgba(245,244,237,0.5)" }}>{checkInDate}</p>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--jood-accent)", flexShrink: 0 }} />
          <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(245,244,237,0.15)", position: "relative" }}>
            <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "#351E1C", padding: "0 8px", fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(245,244,237,0.4)", whiteSpace: "nowrap" }}>
              {nightsLabel}
            </span>
          </div>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", border: "1px solid rgba(245,244,237,0.3)", flexShrink: 0 }} />
        </div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", color: "rgba(245,244,237,0.5)" }}>{checkoutDate}</p>
      </div>
      <p style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.9rem, 2.5vw, 1.05rem)", color: "rgba(245,244,237,0.35)", lineHeight: 1.5, borderTop: "1px solid rgba(245,244,237,0.08)", paddingTop: "16px" }}>
        "{isAr ? quote.ar : quote.en}"
      </p>
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "4px",
            fontSize: "clamp(1.8rem, 8vw, 2.4rem)",
            lineHeight: 1,
            filter: (hover || value) >= star ? "none" : "grayscale(1) opacity(0.3)",
            transform: (hover || value) >= star ? "scale(1.08)" : "scale(1)",
            transition: "transform 150ms, filter 150ms",
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "24px" }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i + 1 === step ? "20px" : "6px",
          height: "6px",
          borderRadius: "3px",
          backgroundColor: i + 1 <= step ? "var(--jood-ink)" : "var(--jood-line)",
          transition: "width 300ms var(--ease-spring), background-color 300ms",
        }} />
      ))}
    </div>
  );
}

export function CheckoutClient({ bookingId, token, checkInDate, checkInMonth, checkoutDate, checkoutTime, nightsCount, propertyName, onCallPhone, locale }: Props) {
  const t = useTranslations("checkout");
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
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingTop: "12px" }}>
        <div style={{
          backgroundColor: "#351E1C",
          borderRadius: "var(--radius-lg)",
          padding: "clamp(36px, 6vw, 56px) clamp(28px, 5vw, 44px)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}>
          <div style={{ fontSize: "3.5rem", lineHeight: 1 }}>✦</div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem, 6vw, 2.6rem)", fontWeight: 600, color: "#F5F4ED", lineHeight: 1.1 }}>
            {isAr ? "نراك قريباً" : "See you next time"}
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.9rem, 2.5vw, 1.05rem)", color: "rgba(245,244,237,0.45)", lineHeight: 1.6, maxWidth: "28ch" }}>
            {isAr ? "شكراً لاختيارك JOOD — كان شرفاً استضافتك." : "Thank you for choosing JOOD — it was a pleasure hosting you."}
          </p>
        </div>

        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: "14px",
              padding: "16px 20px",
              backgroundColor: "var(--jood-surface)",
              border: "1px solid var(--jood-line)",
              borderRadius: "var(--radius-lg)",
              textDecoration: "none",
            }}
          >
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(37,211,102,0.9)">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: "var(--jood-ink)", fontSize: "14px", margin: "0 0 2px" }}>
                {isAr ? "احجز معنا مرة أخرى" : "Book with us again"}
              </p>
              <p style={{ color: "var(--jood-ink-muted)", fontSize: "12px", margin: 0 }}>
                {isAr ? "تواصل عبر واتساب" : "Message us on WhatsApp"}
              </p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--jood-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        )}
      </div>
    );
  }

  /* ── Step 1: Stay postcard ─────────────────────────────────── */
  if (step === 1) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <StepDots step={1} total={3} />
        <ScrapbookCard propertyName={propertyName} checkInDate={checkInDate} checkoutDate={checkoutDate} nightsCount={nightsCount} checkInMonth={checkInMonth} isAr={isAr} />
        <div style={{ backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)", padding: "20px 24px" }}>
          <p className="label-eyebrow" style={{ color: "var(--jood-ink-muted)", marginBottom: "8px" }}>{t("time")}</p>
          <p className="font-display" style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", color: "var(--jood-ink)" }}>{checkoutTime}</p>
          <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.875rem", marginTop: "4px" }}>{checkoutDate}</p>
        </div>
        <button
          onClick={() => setStep(2)}
          style={{ width: "100%", padding: "16px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.9375rem", cursor: "pointer" }}
        >
          {isAr ? "التالي" : "Continue"} →
        </button>
      </div>
    );
  }

  /* ── Step 2: Rate your stay ────────────────────────────────── */
  if (step === 2) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <StepDots step={2} total={3} />
        <div style={{ textAlign: "center", paddingTop: "12px" }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 5vw, 2rem)", fontWeight: 600, color: "var(--jood-ink)", marginBottom: "8px" }}>
            {isAr ? "كيف كانت إقامتك؟" : "How was your stay?"}
          </p>
          <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.9rem" }}>
            {isAr ? "تقييمك يساعدنا على التحسين" : "Your rating helps us improve"}
          </p>
        </div>

        <StarRating value={stars} onChange={setStars} />

        {stars > 0 && (
          <div style={{ animation: "fade-in 200ms ease" }}>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={isAr ? "أخبرنا المزيد (اختياري)" : "Tell us more (optional)"}
              rows={3}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid var(--jood-line)",
                borderRadius: "var(--radius-lg)",
                backgroundColor: "var(--jood-surface)",
                color: "var(--jood-ink)",
                fontSize: "0.9375rem",
                fontFamily: "inherit",
                resize: "none",
                direction: isAr ? "rtl" : "ltr",
                lineHeight: 1.5,
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={submitRating}
            style={{ width: "100%", padding: "16px", backgroundColor: stars > 0 ? "var(--jood-ink)" : "var(--jood-surface)", color: stars > 0 ? "var(--jood-ground)" : "var(--jood-ink-muted)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", fontSize: "0.9375rem", cursor: "pointer", transition: "all 200ms" }}
          >
            {stars > 0 ? (isAr ? "إرسال التقييم" : "Submit rating") : (isAr ? "تخطي" : "Skip")}
          </button>
          <button onClick={() => setStep(1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--jood-ink-muted)", fontSize: "0.875rem", fontFamily: "inherit" }}>
            ← {isAr ? "السابق" : "Back"}
          </button>
        </div>
      </div>
    );
  }

  /* ── Step 3: Checklist + depart ────────────────────────────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <StepDots step={3} total={3} />
      <div style={{ backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)", padding: "20px 24px" }}>
        <p className="label-eyebrow" style={{ color: "var(--jood-ink-muted)", marginBottom: "14px" }}>
          {t("checklist_label")}
        </p>
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0" }}>
          {items.map((item, i) => (
            <li
              key={i}
              onClick={() => toggleItem(i)}
              style={{
                display: "flex", gap: "14px", alignItems: "flex-start",
                padding: "14px 0",
                borderBottom: i < items.length - 1 ? "1px solid var(--jood-line)" : "none",
                cursor: "pointer",
                transition: "opacity 200ms",
                opacity: checkedItems.has(i) ? 0.5 : 1,
              }}
            >
              <div style={{
                width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0, marginTop: "1px",
                border: checkedItems.has(i) ? "none" : "1px solid var(--jood-line)",
                backgroundColor: checkedItems.has(i) ? "var(--jood-ink)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background-color 200ms, border-color 200ms",
              }}>
                {checkedItems.has(i) && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="var(--jood-ground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </div>
              <span style={{ color: "var(--jood-ink)", fontSize: "0.9375rem", lineHeight: 1.55, textDecoration: checkedItems.has(i) ? "line-through" : "none" }}>
                {item}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <button
        onClick={handleDeparted}
        disabled={loading}
        style={{
          width: "100%", padding: "16px",
          backgroundColor: checkedItems.size === items.length ? "var(--jood-ink)" : "var(--jood-surface)",
          color: checkedItems.size === items.length ? "var(--jood-ground)" : "var(--jood-ink-muted)",
          border: "1px solid var(--jood-line)",
          borderRadius: "var(--radius-pill)", fontSize: "0.9375rem",
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1,
          transition: "all 300ms",
        }}
      >
        {loading ? (isAr ? "جارٍ الإرسال…" : "Sending…") : t("departed_cta")}
      </button>
      {checkedItems.size < items.length && (
        <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.8125rem", textAlign: "center", lineHeight: 1.5 }}>
          {t("departed_confirm")}
        </p>
      )}
    </div>
  );
}
