"use client";

import { useState } from "react";
import { useLocale } from "next-intl";

interface GuestRequest {
  id: string;
  category: string;
  body: string;
  urgency: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface Props {
  token: string;
  initialRequests: GuestRequest[];
}

const STATUS_COLOR: Record<string, string> = {
  received: "var(--jood-ink-muted)",
  in_progress: "var(--jood-warning)",
  resolved: "var(--jood-success)",
};

const CAT_EN: Record<string, string> = { maintenance: "Maintenance", housekeeping: "Housekeeping", supplies: "Supplies", service: "Service", other: "Other" };
const CAT_AR: Record<string, string> = { maintenance: "صيانة", housekeeping: "تنظيف", supplies: "مستلزمات", service: "خدمة", other: "أخرى" };

const card: React.CSSProperties = {
  backgroundColor: "var(--jood-surface)",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-lg)",
  padding: "16px 20px",
  marginBottom: "10px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--jood-ground)",
  color: "var(--jood-ink)",
  fontSize: "0.9375rem",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const CATEGORIES = ["maintenance", "housekeeping", "supplies", "other"] as const;

export function GuestRequestsClient({ token, initialRequests }: Props) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [requests, setRequests] = useState(initialRequests);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<string>("other");
  const [body, setBody] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/guest/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, category, body: body.trim(), urgency }),
    });
    setSubmitting(false);
    if (res.ok) {
      const { id } = await res.json();
      setRequests((prev) => [{ id, category, body: body.trim(), urgency, status: "received", admin_notes: null, created_at: new Date().toISOString() }, ...prev]);
      setBody("");
      setCategory("other");
      setUrgency("normal");
      setShowForm(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString(isAr ? "ar-EG" : "en-GB", { day: "numeric", month: "short" });
  }

  const catLabel = (cat: string) => isAr ? (CAT_AR[cat] ?? cat) : (CAT_EN[cat] ?? cat);
  const statusLabel = (s: string) => {
    if (isAr) return s === "received" ? "استُلم" : s === "in_progress" ? "قيد التنفيذ" : "تم الحل";
    return s.replace("_", " ");
  };

  return (
    <div>
      {/* New request button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={{ width: "100%", padding: "14px", marginBottom: "20px", border: "2px dashed var(--jood-line)", borderRadius: "var(--radius-lg)", background: "none", cursor: "pointer", color: "var(--jood-ink-muted)", fontSize: "0.9375rem", fontFamily: "inherit" }}
        >
          + {isAr ? "طلب جديد" : "New request"}
        </button>
      )}

      {submitted && (
        <div style={{ ...card, backgroundColor: "rgba(0,180,100,0.08)", borderColor: "var(--jood-success)", marginBottom: "16px", textAlign: "center" }}>
          <p style={{ color: "var(--jood-success)", fontSize: "0.9375rem" }}>
            {isAr ? "تم إرسال طلبك ✓" : "Request sent ✓"}
          </p>
        </div>
      )}

      {/* New request form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ ...card, marginBottom: "20px" }}>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "14px" }}>
            {isAr ? "طلب جديد" : "New request"}
          </p>

          {/* Category chips */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-pill)",
                  border: `1px solid ${category === cat ? "var(--jood-ink)" : "var(--jood-line)"}`,
                  backgroundColor: category === cat ? "var(--jood-ink)" : "transparent",
                  color: category === cat ? "var(--jood-ground)" : "var(--jood-ink-muted)",
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {catLabel(cat)}
              </button>
            ))}
          </div>

          {/* Body */}
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={isAr ? "أخبرنا بما تحتاج…" : "Tell us what you need…"}
            style={{ ...inputStyle, resize: "vertical", minHeight: "90px", marginBottom: "12px", direction: isAr ? "rtl" : "ltr" }}
          />

          {/* Urgency */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            {(["normal", "urgent"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUrgency(u)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-pill)",
                  border: `1px solid ${urgency === u ? (u === "urgent" ? "var(--jood-danger)" : "var(--jood-ink)") : "var(--jood-line)"}`,
                  backgroundColor: "transparent",
                  color: urgency === u ? (u === "urgent" ? "var(--jood-danger)" : "var(--jood-ink)") : "var(--jood-ink-muted)",
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {isAr ? (u === "normal" ? "عادي" : "عاجل") : (u === "normal" ? "Normal" : "Urgent")}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit" disabled={submitting || !body.trim()} style={{ padding: "10px 22px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.9375rem", cursor: "pointer", opacity: submitting || !body.trim() ? 0.5 : 1 }}>
              {submitting ? (isAr ? "جارٍ الإرسال…" : "Sending…") : (isAr ? "أرسل" : "Send")}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: "10px 16px", background: "none", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", fontSize: "0.9375rem", cursor: "pointer", color: "var(--jood-ink-muted)" }}>
              {isAr ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </form>
      )}

      {/* Past requests */}
      {!requests.length && !showForm && (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--jood-ink-muted)" }}>
          <p style={{ fontSize: "1.8rem", marginBottom: "12px" }}>💬</p>
          <p style={{ fontSize: "0.9375rem" }}>{isAr ? "لا توجد طلبات بعد" : "No requests yet"}</p>
        </div>
      )}

      {requests.map((r) => (
        <div key={r.id} style={{ ...card, borderLeft: r.urgency === "urgent" ? "3px solid var(--jood-danger)" : "1px solid var(--jood-line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--jood-ink-muted)" }}>{catLabel(r.category)}</span>
              {r.urgency === "urgent" && <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--jood-danger)" }}>{isAr ? "عاجل" : "Urgent"}</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: STATUS_COLOR[r.status] }}>
                {statusLabel(r.status)}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--jood-ink-ghost)" }}>{fmt(r.created_at)}</span>
            </div>
          </div>
          <p style={{ fontSize: "0.9375rem", color: "var(--jood-ink)", lineHeight: 1.6, direction: isAr ? "rtl" : "ltr" }}>{r.body}</p>
          {r.admin_notes && (
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--jood-line)" }}>
              <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--jood-aqua)", marginBottom: "4px" }}>
                {isAr ? "رد الفريق" : "Team reply"}
              </p>
              <p style={{ fontSize: "0.875rem", color: "var(--jood-ink)", lineHeight: 1.6 }}>{r.admin_notes}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
