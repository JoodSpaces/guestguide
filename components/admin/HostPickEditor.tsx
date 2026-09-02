"use client";

import { useState } from "react";

interface Props {
  propertyId: string;
  initialPick: string;
  initialPickAr: string;
}

export function HostPickEditor({ propertyId, initialPick, initialPickAr }: Props) {
  const [pick, setPick] = useState(initialPick);
  const [pickAr, setPickAr] = useState(initialPickAr);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch(`/api/admin/properties/${propertyId}/pick`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host_pick: pick.trim() || null, host_pick_ar: pickAr.trim() || null }),
    });
    setSaving(false);
    setSaved(true);
  }

  const field: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid var(--jood-line)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--jood-ground)",
    color: "var(--jood-ink)",
    fontSize: "0.9375rem",
    boxSizing: "border-box",
    resize: "vertical",
    minHeight: "72px",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      backgroundColor: "var(--jood-surface)",
      border: "1px solid var(--jood-line)",
      borderRadius: "var(--radius-lg)",
      padding: "20px 24px",
      marginBottom: "24px",
    }}>
      <div style={{ marginBottom: "16px" }}>
        <p style={{
          fontFamily: "var(--font-label)", fontSize: "0.65rem",
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--jood-garnet)", marginBottom: "4px",
        }}>
          Host&apos;s Live Pick
        </p>
        <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>
          A short recommendation shown on the guest home screen. Update anytime — it changes live.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "6px", fontFamily: "var(--font-label)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            English
          </label>
          <textarea
            style={field}
            value={pick}
            onChange={(e) => { setPick(e.target.value); setSaved(false); }}
            placeholder="e.g. The fish market on Tuesday mornings is worth the early wake-up."
          />
        </div>
        <div dir="rtl">
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "6px", fontFamily: "var(--font-label)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            عربي
          </label>
          <textarea
            style={{ ...field, fontFamily: "var(--font-arabic)" }}
            value={pickAr}
            onChange={(e) => { setPickAr(e.target.value); setSaved(false); }}
            placeholder="مثال: سوق السمك صباح الثلاثاء يستحق الاستيقاظ مبكراً."
          />
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        style={{
          padding: "9px 20px",
          background: saved ? "var(--jood-success-surface)" : "var(--jood-ink)",
          color: saved ? "var(--jood-success)" : "var(--jood-ground)",
          border: saved ? "1px solid var(--jood-success)" : "none",
          borderRadius: "var(--radius-pill)",
          fontFamily: "var(--font-label)",
          fontSize: "0.8rem",
          letterSpacing: "0.06em",
          cursor: "pointer",
          opacity: saving ? 0.6 : 1,
          transition: "background 200ms, color 200ms",
        }}
      >
        {saved ? "✓ Saved" : saving ? "Saving…" : "Save pick"}
      </button>
    </div>
  );
}
