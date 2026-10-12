"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The confirmation card shown before anything a guest says or types becomes a request to the team. The guest sees exactly what will be sent, can
 * change the words, the type and the urgency, and then sends it or cancels. Nothing reaches the team until they tap Send.
 * Used by the Requests form, the text concierge and the voice concierge (emergencies are the one thing that is never held back).
 */
export type RequestCategory = "maintenance" | "housekeeping" | "supplies" | "service" | "other";
export interface RequestDraft { text: string; category: RequestCategory; urgent: boolean }

const LABEL: Record<RequestCategory, { en: string; ar: string }> = {
  maintenance: { en: "Something to fix", ar: "شيء يحتاج إصلاحاً" },
  housekeeping: { en: "Cleaning or linen", ar: "تنظيف أو مفروشات" },
  supplies: { en: "Supplies", ar: "مستلزمات" },
  service: { en: "A service", ar: "خدمة" },
  other: { en: "Something else", ar: "أمر آخر" },
};
const SOURCE = {
  form: { en: "Written by you", ar: "كتبتَه بنفسك" },
  chat: { en: "From your chat with the concierge", ar: "من محادثتك مع الكونسيرج" },
  voice: { en: "From your voice conversation", ar: "من محادثتك الصوتية" },
} as const;

const T = {
  en: { title: "Send this to the team?", what: "What we will send", type: "Type", urgent: "Urgent", next: "The JOOD team is told straight away. You will see their reply on the Requests screen.",
        send: "Send to the team", cancel: "Cancel", sending: "Sending…", property: "For" },
  ar: { title: "هل ترسل هذا إلى الفريق؟", what: "ما سنرسله", type: "النوع", urgent: "عاجل", next: "يصل الطلب إلى فريق جود فوراً، وسترى ردّهم في شاشة الطلبات.",
        send: "أرسل إلى الفريق", cancel: "إلغاء", sending: "جاري الإرسال…", property: "للعقار" },
} as const;

interface Props {
  isAr: boolean;
  draft: RequestDraft;
  source: keyof typeof SOURCE;
  propertyName?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: (d: RequestDraft) => void;
  onCancel: () => void;
}

export function RequestConfirm({ isAr, draft, source, propertyName, busy, error, onConfirm, onCancel }: Props) {
  const t = T[isAr ? "ar" : "en"];
  const [text, setText] = useState(draft.text);
  const [category, setCategory] = useState<RequestCategory>(draft.category);
  const [urgent, setUrgent] = useState(draft.urgent);
  const sendRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { sendRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onCancel(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [busy, onCancel]);

  const ready = text.trim().length > 0 && !busy;
  const pill = (on: boolean): React.CSSProperties => ({
    padding: "6px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)",
    border: `1px solid ${on ? "var(--jood-garnet)" : "var(--jood-line)"}`, background: on ? "var(--jood-garnet)" : "transparent", color: on ? "#fff" : "var(--jood-ink)",
  });
  const label: React.CSSProperties = { fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-subtle)", margin: "14px 0 6px" };

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="rc-title" dir={isAr ? "rtl" : "ltr"}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10,6,6,.62)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12 }}
    >
      <div style={{ width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", background: "var(--jood-surface, #fff)", color: "var(--jood-ink)", borderRadius: 20, padding: "22px 20px 18px", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
        <h2 id="rc-title" style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>{t.title}</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--jood-ink-muted)" }}>
          {SOURCE[source][isAr ? "ar" : "en"]}{propertyName ? ` · ${t.property} ${propertyName}` : ""}
        </p>

        <p style={label}>{t.what}</p>
        <textarea
          value={text} onChange={(e) => setText(e.target.value.slice(0, 2000))} rows={4} disabled={busy}
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", border: "1px solid var(--jood-line)", borderRadius: 12, background: "var(--jood-ground, transparent)", color: "var(--jood-ink)", fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.6, resize: "vertical", direction: isAr ? "rtl" : "ltr" }}
        />

        <p style={label}>{t.type}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(Object.keys(LABEL) as RequestCategory[]).map((k) => (
            <button key={k} type="button" disabled={busy} onClick={() => setCategory(k)} aria-pressed={category === k} style={pill(category === k)}>{LABEL[k][isAr ? "ar" : "en"]}</button>
          ))}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, cursor: "pointer", fontSize: 14 }}>
          <input type="checkbox" checked={urgent} disabled={busy} onChange={(e) => setUrgent(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--jood-garnet)" }} />
          {t.urgent}
        </label>

        <p style={{ margin: "16px 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--jood-ink-muted)" }}>{t.next}</p>
        {error && <p role="alert" style={{ margin: "10px 0 0", fontSize: 13, color: "var(--jood-danger)" }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            ref={sendRef} type="button" disabled={!ready} onClick={() => onConfirm({ text: text.trim(), category, urgent })}
            style={{ flex: 1, padding: "13px 18px", borderRadius: 999, border: "none", background: "var(--jood-ink)", color: "var(--jood-ground, #fff)", fontSize: 15, cursor: ready ? "pointer" : "default", opacity: ready ? 1 : 0.5 }}
          >{busy ? t.sending : t.send}</button>
          <button
            type="button" disabled={busy} onClick={onCancel}
            style={{ padding: "13px 18px", borderRadius: 999, border: "1px solid var(--jood-line)", background: "transparent", color: "var(--jood-ink)", fontSize: 15, cursor: "pointer" }}
          >{t.cancel}</button>
        </div>
      </div>
    </div>
  );
}
