"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";

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
  bookingId: string;
  initialRequests: GuestRequest[];
}

const CAT_EN: Record<string, string> = { maintenance: "Maintenance", housekeeping: "Housekeeping", supplies: "Supplies", other: "Other" };
const CAT_AR: Record<string, string> = { maintenance: "صيانة", housekeeping: "تنظيف", supplies: "مستلزمات", other: "أخرى" };
const CAT_ICON: Record<string, string> = { maintenance: "🔧", housekeeping: "🧹", supplies: "📦", other: "💬" };

const STATUS_LABEL_EN: Record<string, string> = { received: "Received", in_progress: "In progress", resolved: "Resolved" };
const STATUS_LABEL_AR: Record<string, string> = { received: "استُلم", in_progress: "قيد التنفيذ", resolved: "تم الحل" };
const STATUS_DOT: Record<string, string> = { received: "#94a3b8", in_progress: "#f59e0b", resolved: "#4ade80" };

const STATUS_TOAST_EN: Record<string, string> = { in_progress: "We're on it!", resolved: "Request resolved ✓" };
const STATUS_TOAST_AR: Record<string, string> = { in_progress: "جارٍ المعالجة!", resolved: "تم حل الطلب ✓" };

const CATEGORIES = ["maintenance", "housekeeping", "supplies", "other"] as const;

function fmtTime(iso: string, isAr: boolean) {
  return new Date(iso).toLocaleTimeString(isAr ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string, isAr: boolean) {
  return new Date(iso).toLocaleDateString(isAr ? "ar-EG" : "en-GB", { day: "numeric", month: "short" });
}

export function GuestRequestsClient({ token, bookingId, initialRequests }: Props) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const bottomRef = useRef<HTMLDivElement>(null);

  const [requests, setRequests] = useState(initialRequests);
  const [category, setCategory] = useState<string>("other");
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [aiClassifying, setAiClassifying] = useState(false);
  const [aiClassified, setAiClassified] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const classifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`requests:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guest_requests",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as GuestRequest;
            setRequests((prev) =>
              prev.map((r) => {
                if (r.id !== updated.id) return r;
                if (updated.status !== r.status) {
                  const msg = isAr ? STATUS_TOAST_AR[updated.status] : STATUS_TOAST_EN[updated.status];
                  if (msg) {
                    setStatusToast(msg);
                    setTimeout(() => setStatusToast(null), 4000);
                  }
                }
                return { ...r, ...updated };
              })
            );
          } else if (payload.eventType === "INSERT") {
            const newReq = payload.new as GuestRequest;
            setRequests((prev) => {
              if (prev.some((r) => r.id === newReq.id)) return prev;
              return [...prev, newReq];
            });
          }
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, [bookingId, isAr]);

  // Fallback 5s poll (Realtime as primary, poll as safety net)
  useEffect(() => {
    const poll = setInterval(async () => {
      const res = await fetch(`/api/guest/requests?token=${token}`).catch(() => null);
      if (!res?.ok) return;
      const data: GuestRequest[] = await res.json();
      setRequests((prev) => {
        const hasChange = data.some((r) => {
          const old = prev.find((p) => p.id === r.id);
          return !old || old.status !== r.status || old.admin_notes !== r.admin_notes;
        });
        return hasChange ? data : prev;
      });
    }, 5_000);
    return () => clearInterval(poll);
  }, [token]);

  // Scroll to bottom when requests change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [requests.length]);

  const classify = useCallback(async (text: string) => {
    setAiClassifying(true);
    setAiClassified(false);
    const res = await fetch("/api/guest/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, body: text }),
    }).catch(() => null);
    setAiClassifying(false);
    if (!res?.ok) return;
    const data: { category: string; urgency: "normal" | "urgent" } = await res.json();
    setCategory(data.category);
    if (data.urgency === "urgent") setUrgency("urgent");
    setAiClassified(true);
  }, [token]);

  useEffect(() => {
    if (classifyTimer.current) clearTimeout(classifyTimer.current);
    const trimmed = body.trim();
    if (trimmed.length < 15) { setAiClassified(false); return; }
    classifyTimer.current = setTimeout(() => classify(trimmed), 700);
    return () => { if (classifyTimer.current) clearTimeout(classifyTimer.current); };
  }, [body, classify]);

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
      const { id, category: serverCategory, urgency: serverUrgency } = await res.json();
      const newReq: GuestRequest = {
        id,
        category: serverCategory ?? category,
        body: body.trim(),
        urgency: serverUrgency ?? urgency,
        status: "received",
        admin_notes: null,
        created_at: new Date().toISOString(),
      };
      setRequests((prev) => [...prev, newReq]);
      setBody("");
      setCategory("other");
      setUrgency("normal");
      setAiClassified(false);
      setShowCompose(false);
      setJustSent(true);
      setTimeout(() => setJustSent(false), 4000);
    }
  }

  const catLabel = (cat: string) => isAr ? (CAT_AR[cat] ?? cat) : (CAT_EN[cat] ?? cat);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 120px)" }}>
      {/* Thread header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        paddingBottom: "16px",
        marginBottom: "4px",
        borderBottom: "1px solid var(--jood-line)",
        flexShrink: 0,
      }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "50%",
          backgroundColor: "var(--jood-ink)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.75rem", color: "var(--jood-ground)", fontWeight: 700,
          flexShrink: 0,
        }}>J</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 500, fontSize: "0.9375rem" }}>
            {isAr ? "فريق JOOD" : "JOOD Concierge"}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{
              width: "6px", height: "6px", borderRadius: "50%",
              backgroundColor: isLive ? "#4ade80" : "#f59e0b",
              display: "inline-block",
              transition: "background-color 500ms",
            }} />
            <p style={{ fontSize: "0.75rem", color: "var(--jood-ink-muted)" }}>
              {isLive
                ? (isAr ? "متصل مباشرة" : "Live")
                : (isAr ? "متاح الآن" : "Available now")}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 0", display: "flex", flexDirection: "column", gap: "4px" }}>
        {requests.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", color: "var(--jood-ink-muted)", padding: "40px 0" }}>
            <span style={{ fontSize: "2.5rem" }}>💬</span>
            <p style={{ fontSize: "0.9375rem", textAlign: "center", lineHeight: 1.6 }}>
              {isAr ? "أرسل لنا طلبك\nوسنرد بأقرب وقت" : "Send us a message\nand we'll reply shortly"}
            </p>
          </div>
        )}

        {requests.map((r, i) => {
          const prevDate = i > 0 ? fmtDate(requests[i - 1].created_at, isAr) : null;
          const thisDate = fmtDate(r.created_at, isAr);
          const showDateDivider = thisDate !== prevDate;

          return (
            <div key={r.id}>
              {showDateDivider && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "12px 0" }}>
                  <div style={{ flex: 1, height: "1px", backgroundColor: "var(--jood-line)" }} />
                  <span style={{ fontSize: "0.7rem", color: "var(--jood-ink-ghost)", fontFamily: "var(--font-label)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {thisDate}
                  </span>
                  <div style={{ flex: 1, height: "1px", backgroundColor: "var(--jood-line)" }} />
                </div>
              )}

              {/* Guest message bubble */}
              <div style={{ display: "flex", justifyContent: isAr ? "flex-start" : "flex-end", marginBottom: "6px" }}>
                <div style={{ maxWidth: "80%" }}>
                  <div style={{
                    backgroundColor: "var(--jood-ink)",
                    color: "var(--jood-ground)",
                    borderRadius: isAr
                      ? "var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px"
                      : "var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)",
                    padding: "12px 16px",
                    fontSize: "0.9375rem",
                    lineHeight: 1.6,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", opacity: 0.6 }}>
                      <span style={{ fontSize: "0.8rem" }}>{CAT_ICON[r.category] ?? "💬"}</span>
                      <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-label)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        {catLabel(r.category)}
                        {r.urgency === "urgent" && <span style={{ marginInlineStart: "6px", color: "#fca5a5" }}>· {isAr ? "عاجل" : "Urgent"}</span>}
                      </span>
                    </div>
                    {r.body}
                  </div>
                  {/* Status + time */}
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", justifyContent: isAr ? "flex-start" : "flex-end", marginTop: "4px", paddingInline: "4px" }}>
                    <span style={{
                      width: "6px", height: "6px", borderRadius: "50%",
                      backgroundColor: STATUS_DOT[r.status] ?? "#94a3b8",
                      display: "inline-block", flexShrink: 0,
                      transition: "background-color 600ms ease",
                    }} />
                    <span style={{ fontSize: "0.7rem", color: "var(--jood-ink-ghost)", transition: "color 300ms" }}>
                      {isAr ? STATUS_LABEL_AR[r.status] : STATUS_LABEL_EN[r.status]} · {fmtTime(r.created_at, isAr)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Team reply bubble */}
              {r.admin_notes && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "6px", justifyContent: isAr ? "flex-end" : "flex-start" }}>
                  <div style={{
                    width: "26px", height: "26px", borderRadius: "50%",
                    backgroundColor: "var(--jood-surface-raised)",
                    border: "1px solid var(--jood-line)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.6rem", fontWeight: 700, color: "var(--jood-ink)",
                    flexShrink: 0,
                  }}>J</div>
                  <div style={{ maxWidth: "80%" }}>
                    <div style={{
                      backgroundColor: "var(--jood-surface)",
                      border: "1px solid var(--jood-line)",
                      borderRadius: isAr
                        ? "var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)"
                        : "var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px",
                      padding: "12px 16px",
                      fontSize: "0.9375rem",
                      lineHeight: 1.6,
                      color: "var(--jood-ink)",
                    }}>
                      {r.admin_notes}
                    </div>
                    <p style={{ fontSize: "0.7rem", color: "var(--jood-ink-ghost)", marginTop: "4px", paddingInline: "4px" }}>
                      {isAr ? "فريق JOOD" : "JOOD team"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Status toast */}
      {statusToast && (
        <div style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 16px",
          backgroundColor: "var(--jood-surface)",
          border: "1px solid var(--jood-line)",
          borderRadius: "var(--radius-lg)",
          marginBottom: "8px",
          animation: "fade-in 200ms ease",
        }}>
          <span style={{ fontSize: "1rem" }}>🛎️</span>
          <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--jood-ink)" }}>
            {statusToast}
          </p>
        </div>
      )}

      {/* Sent confirmation banner */}
      {justSent && (
        <div style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 16px",
          backgroundColor: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: "var(--radius-lg)",
          marginBottom: "8px",
          animation: "fade-in 200ms ease",
        }}>
          <span style={{ fontSize: "1.1rem" }}>✓</span>
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#15803d" }}>
              {isAr ? "تم استلام طلبك" : "Request received"}
            </p>
            <p style={{ fontSize: "0.75rem", color: "#16a34a", marginTop: "1px" }}>
              {isAr ? "سنرد عليك خلال ساعتين" : "We'll reply within 2 hours"}
            </p>
          </div>
        </div>
      )}

      {/* Compose area */}
      <div style={{
        flexShrink: 0,
        borderTop: "1px solid var(--jood-line)",
        paddingTop: "12px",
        backgroundColor: "var(--jood-ground)",
      }}>
        {showCompose ? (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* Category chips */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => { setCategory(cat); setAiClassified(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    padding: "5px 12px",
                    borderRadius: "var(--radius-pill)",
                    border: `1px solid ${category === cat ? "var(--jood-ink)" : "var(--jood-line)"}`,
                    backgroundColor: category === cat ? "var(--jood-ink)" : "transparent",
                    color: category === cat ? "var(--jood-ground)" : "var(--jood-ink-muted)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 160ms",
                  }}
                >
                  {CAT_ICON[cat]} {catLabel(cat)}
                </button>
              ))}
              {aiClassifying && (
                <span style={{ fontSize: "0.7rem", color: "var(--jood-ink-ghost)", fontFamily: "var(--font-label)", letterSpacing: "0.06em" }}>
                  {isAr ? "جاري التصنيف…" : "Classifying…"}
                </span>
              )}
              {aiClassified && !aiClassifying && (
                <span style={{ fontSize: "0.7rem", color: "var(--jood-aqua)", fontFamily: "var(--font-label)", letterSpacing: "0.06em" }}>
                  ✦ {isAr ? "تصنيف تلقائي" : "Auto-classified"}
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <textarea
                required
                autoFocus
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={isAr ? "أخبرنا بما تحتاج…" : "Tell us what you need…"}
                rows={2}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  border: "1px solid var(--jood-line)",
                  borderRadius: "var(--radius-lg)",
                  backgroundColor: "var(--jood-surface)",
                  color: "var(--jood-ink)",
                  fontSize: "0.9375rem",
                  fontFamily: "inherit",
                  resize: "none",
                  direction: isAr ? "rtl" : "ltr",
                  lineHeight: 1.5,
                }}
              />
              <button
                type="submit"
                disabled={submitting || !body.trim()}
                style={{
                  width: "42px", height: "42px",
                  borderRadius: "50%",
                  backgroundColor: body.trim() ? "var(--jood-ink)" : "var(--jood-line)",
                  color: "var(--jood-ground)",
                  border: "none",
                  cursor: body.trim() ? "pointer" : "default",
                  fontSize: "1rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  transition: "background-color 200ms",
                }}
              >
                {submitting ? "…" : (isAr ? "←" : "→")}
              </button>
            </div>

            {/* Urgency */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <button type="button" onClick={() => setShowCompose(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--jood-ink-muted)", fontSize: "0.8rem", fontFamily: "inherit", padding: 0 }}>
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <div style={{ flex: 1 }} />
              {(["normal", "urgent"] as const).map((u) => (
                <button key={u} type="button" onClick={() => setUrgency(u)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "var(--radius-pill)",
                    border: `1px solid ${urgency === u ? (u === "urgent" ? "var(--jood-danger)" : "var(--jood-ink)") : "var(--jood-line)"}`,
                    backgroundColor: "transparent",
                    color: urgency === u ? (u === "urgent" ? "var(--jood-danger)" : "var(--jood-ink)") : "var(--jood-ink-ghost)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}>
                  {isAr ? (u === "normal" ? "عادي" : "عاجل") : (u === "normal" ? "Normal" : "Urgent")}
                </button>
              ))}
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowCompose(true)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              backgroundColor: "var(--jood-surface)",
              border: "1px solid var(--jood-line)",
              borderRadius: "var(--radius-pill)",
              cursor: "pointer",
              fontFamily: "inherit",
              color: "var(--jood-ink-muted)",
              fontSize: "0.9375rem",
              textAlign: isAr ? "right" : "left",
            }}
          >
            <span style={{ fontSize: "1rem" }}>✍️</span>
            {isAr ? "أرسل طلبًا جديدًا…" : "Send a new request…"}
          </button>
        )}
      </div>
    </div>
  );
}
