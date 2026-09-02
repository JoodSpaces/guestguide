"use client";

import { useState } from "react";

const OCCASIONS = [
  { value: "leisure",     en: "Leisure",      ar: "ترفيه",      icon: "🌴" },
  { value: "business",    en: "Business",     ar: "أعمال",       icon: "💼" },
  { value: "honeymoon",   en: "Honeymoon",    ar: "شهر العسل",   icon: "🌹" },
  { value: "birthday",    en: "Birthday",     ar: "عيد ميلاد",   icon: "🎂" },
  { value: "anniversary", en: "Anniversary",  ar: "ذكرى سنوية",  icon: "✦" },
  { value: "family",      en: "Family",       ar: "عائلي",       icon: "👨‍👩‍👧" },
  { value: "other",       en: "Other",        ar: "أخرى",        icon: "◎" },
];

const TEMPS = [
  { value: "cool", en: "Cool (AC on)", ar: "بارد (مكيف مفتوح)", icon: "❄️" },
  { value: "warm", en: "Warm",         ar: "دافئ",              icon: "☀️" },
  { value: "any",  en: "No preference", ar: "لا أهمية",         icon: "—" },
];

interface Prefs {
  occasion: string | null;
  temp_pref: string | null;
  notes: string | null;
}

interface Props {
  token: string;
  locale: string;
  initialPrefs: Prefs | null;
}

export function CustomizeForm({ token, locale, initialPrefs }: Props) {
  const isAr = locale === "ar";
  const [occasion, setOccasion] = useState(initialPrefs?.occasion ?? "");
  const [tempPref, setTempPref] = useState(initialPrefs?.temp_pref ?? "any");
  const [notes, setNotes] = useState(initialPrefs?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!initialPrefs);

  async function submit() {
    setSaving(true);
    const res = await fetch("/api/guest/arrival-preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        occasion: occasion || null,
        tempPref: tempPref || null,
        notes: notes.trim() || null,
      }),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  const pill: React.CSSProperties = {
    flexShrink: 0,
    padding: "10px 16px",
    borderRadius: "99px",
    border: "1px solid var(--jood-line)",
    background: "none",
    fontFamily: "var(--font-body)",
    fontSize: "13.5px",
    color: "var(--jood-ink-muted)",
    cursor: "pointer",
    transition: "border-color 150ms, background 150ms, color 150ms",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    whiteSpace: "nowrap",
  };

  const pillActive: React.CSSProperties = {
    ...pill,
    border: "1px solid var(--jood-ink)",
    background: "var(--jood-ink)",
    color: "var(--jood-ground)",
  };

  return (
    <div style={{ paddingBottom: "40px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <p style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.8rem, 6vw, 2.4rem)",
          fontWeight: 300,
          fontStyle: "italic",
          color: "var(--jood-ink)",
          lineHeight: 1.1,
          marginBottom: "8px",
        }}>
          {isAr ? "دعنا نُعدّ\nإقامتك لك." : "Let us prepare\nyour stay."}
        </p>
        <p style={{ fontSize: "13.5px", color: "var(--jood-ink-muted)", lineHeight: 1.6 }}>
          {isAr
            ? "أخبرنا قليلاً عن إقامتك وسنتأكد أن كل شيء مُعدّ بشكل مثالي لك."
            : "Tell us a little about your visit and we'll make sure everything is set up perfectly for you."}
        </p>
      </div>

      {/* Section: Occasion */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{
          fontFamily: "var(--font-label)", fontSize: "8px",
          letterSpacing: "0.2em", textTransform: "uppercase",
          color: "var(--jood-garnet)", marginBottom: "14px",
        }}>
          {isAr ? "مناسبة الإقامة" : "Occasion"}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {OCCASIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setOccasion(o.value === occasion ? "" : o.value)}
              style={occasion === o.value ? pillActive : pill}
            >
              <span>{o.icon}</span>
              <span>{isAr ? o.ar : o.en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Section: Temperature */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{
          fontFamily: "var(--font-label)", fontSize: "8px",
          letterSpacing: "0.2em", textTransform: "uppercase",
          color: "var(--jood-garnet)", marginBottom: "14px",
        }}>
          {isAr ? "درجة حرارة الغرفة" : "Room temperature"}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {TEMPS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTempPref(t.value)}
              style={tempPref === t.value ? pillActive : pill}
            >
              <span>{t.icon}</span>
              <span>{isAr ? t.ar : t.en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Section: Notes */}
      <div style={{ marginBottom: "32px" }}>
        <p style={{
          fontFamily: "var(--font-label)", fontSize: "8px",
          letterSpacing: "0.2em", textTransform: "uppercase",
          color: "var(--jood-garnet)", marginBottom: "14px",
        }}>
          {isAr ? "أي شيء آخر؟" : "Anything else?"}
        </p>
        <textarea
          className="jood-textarea"
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
          placeholder={isAr
            ? "مثال: نحتفل بذكرى زواجنا، يُرجى ترتيب الورود... أو أي طلبات خاصة"
            : "e.g. Celebrating our anniversary, would love rose petals... or any special requests"}
          style={{ width: "100%", resize: "vertical", minHeight: "100px", boxSizing: "border-box", direction: isAr ? "rtl" : "ltr" }}
        />
      </div>

      {/* Submit */}
      <button
        onClick={submit}
        disabled={saving || saved}
        className="btn btn-primary"
        style={{
          width: "100%",
          opacity: saving ? 0.6 : 1,
          transition: "opacity 150ms",
        }}
      >
        {saved
          ? (isAr ? "✓ تم الحفظ — شكراً لك!" : "✓ Saved — thank you!")
          : saving
            ? (isAr ? "جاري الحفظ…" : "Saving…")
            : (isAr ? "أرسل تفضيلاتك" : "Send your preferences")}
      </button>

      {saved && !saving && (
        <p style={{
          marginTop: "16px",
          textAlign: "center",
          fontSize: "12.5px",
          color: "var(--jood-ink-muted)",
          lineHeight: 1.6,
          fontStyle: "italic",
        }}>
          {isAr
            ? "وصلنا طلبك وسيتأكد فريقنا من تجهيز كل شيء قبل وصولك."
            : "Our team will make sure everything is ready before you arrive."}
        </p>
      )}
    </div>
  );
}
