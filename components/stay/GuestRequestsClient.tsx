"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const STATUS_COLOR: Record<string, string> = {
  open:        "var(--jood-warning)",
  in_progress: "var(--jood-aqua)",
  resolved:    "var(--jood-success)",
  cancelled:   "var(--jood-ink-faint)",
};

const STATUS_LABEL_EN: Record<string, string> = {
  open:        "Open",
  in_progress: "In progress",
  resolved:    "Resolved",
  cancelled:   "Cancelled",
};
const STATUS_LABEL_AR: Record<string, string> = {
  open:        "مفتوح",
  in_progress: "قيد التنفيذ",
  resolved:    "تم الحل",
  cancelled:   "ملغى",
};

/* Matches the DB columns selected by the requests page */
interface GuestRequest {
  id: string;
  category: string;
  body: string;
  urgency: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface GuestRequestsClientProps {
  token: string;
  bookingId: string;
  initialRequests: GuestRequest[];
}

function fmtDate(iso: string, isAr: boolean): string {
  return new Date(iso).toLocaleDateString(isAr ? "ar-EG" : "en-GB", {
    day: "2-digit", month: "short",
  });
}

function groupByDate(requests: GuestRequest[], isAr: boolean) {
  const map = new Map<string, GuestRequest[]>();
  for (const r of requests) {
    const key = fmtDate(r.created_at, isAr);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

export function GuestRequestsClient({ token, bookingId, initialRequests }: GuestRequestsClientProps) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [requests, setRequests] = useState<GuestRequest[]>(initialRequests);
  const [body, setBody] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [sending, setSending] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const classifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [predictedCategory, setPredictedCategory] = useState<string | null>(null);

  /* Realtime subscription */
  useEffect(() => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
    const channel = supabase
      .channel(`booking-requests-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guest_requests", filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setRequests((prev) => [payload.new as GuestRequest, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setRequests((prev) =>
              prev.map((r) => (r.id === payload.new.id ? { ...r, ...payload.new } : r))
            );
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);

  /* Auto-classify — debounced 800 ms, no setState in effect body */
  useEffect(() => {
    if (classifyTimer.current) clearTimeout(classifyTimer.current);
    if (body.trim().length < 10) {
      classifyTimer.current = setTimeout(() => setPredictedCategory(null), 0);
      return () => { if (classifyTimer.current) clearTimeout(classifyTimer.current); };
    }
    classifyTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/guest/classify-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        });
        if (res.ok) {
          const { category } = await res.json();
          setPredictedCategory(category);
        }
      } catch {}
    }, 800);
    return () => { if (classifyTimer.current) clearTimeout(classifyTimer.current); };
  }, [body]);

  async function submitRequest() {
    if (!body.trim()) return;
    setSending(true);
    const res = await fetch("/api/guest/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, body: body.trim(), isUrgent: urgent }),
    });
    setSending(false);
    if (res.ok) {
      const newReq: GuestRequest = await res.json();
      setRequests((prev) => [newReq, ...prev]);
      setBody("");
      setUrgent(false);
      setPredictedCategory(null);
    }
  }

  const groups = groupByDate(requests, isAr);
  const isUrgent = (r: GuestRequest) => r.urgency === "high" || r.urgency === "emergency";

  return (
    <div>
      {/* ── Compose ─────────────────────────────────────────────────────── */}
      <div style={{
        border: "1px solid var(--jood-line)",
        borderRadius: "16px",
        overflow: "hidden",
        marginBottom: "32px",
        backgroundColor: "var(--jood-surface)",
      }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={isAr ? "كيف يمكننا مساعدتك؟" : "How can we help you?"}
          rows={3}
          style={{
            width: "100%",
            padding: "16px 18px",
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            fontFamily: "var(--font-body)",
            fontSize: "15px",
            color: "var(--jood-ink)",
            lineHeight: 1.6,
            boxSizing: "border-box",
            direction: isAr ? "rtl" : "ltr",
          }}
        />

        {predictedCategory && (
          <div style={{ padding: "0 18px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{
              fontFamily: "var(--font-label)", fontSize: "8px", letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--jood-ink-faint)",
            }}>
              {isAr ? "تصنيف" : "Category"}
            </span>
            <span style={{
              fontFamily: "var(--font-label)", fontSize: "8px", letterSpacing: "0.12em",
              textTransform: "uppercase", color: "var(--jood-garnet)",
              border: "1px solid var(--jood-garnet)", borderRadius: "99px", padding: "2px 7px",
            }}>
              {predictedCategory}
            </span>
          </div>
        )}

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 18px 14px", borderTop: "1px solid var(--jood-line)",
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <div
              onClick={() => setUrgent((u) => !u)}
              style={{
                width: "18px", height: "18px", borderRadius: "4px",
                border: urgent ? "none" : "1.5px solid var(--jood-line)",
                backgroundColor: urgent ? "var(--jood-garnet)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0, transition: "background-color 180ms",
              }}
            >
              {urgent && <span style={{ color: "#fff", fontSize: "10px", lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ fontSize: "13px", color: "var(--jood-mid)", fontFamily: "var(--font-body)" }}>
              {isAr ? "عاجل" : "Urgent"}
            </span>
          </label>

          <button
            onClick={submitRequest}
            disabled={sending || !body.trim()}
            style={{
              fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: body.trim() ? "var(--jood-garnet)" : "var(--jood-ink-faint)",
              background: "none", border: "none",
              cursor: body.trim() ? "pointer" : "default",
              opacity: sending ? 0.5 : 1, padding: "0", transition: "color 180ms",
            }}
          >
            {sending ? (isAr ? "جاري الإرسال…" : "Sending…") : (isAr ? "أرسل ←" : "Send →")}
          </button>
        </div>
      </div>

      {/* ── Logbook ──────────────────────────────────────────────────────── */}
      {requests.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--jood-ink-faint)" }}>
          <p style={{ fontSize: "1.5rem", marginBottom: "8px" }}>✦</p>
          <p style={{ fontSize: "14px" }}>{isAr ? "لا توجد طلبات بعد" : "No requests yet"}</p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.label}>
            {/* Date divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "24px 0 12px" }}>
              <div style={{ flex: 1, height: "1px", backgroundColor: "var(--jood-line)" }} />
              <p style={{
                fontFamily: "var(--font-label)", fontSize: "8px", letterSpacing: "0.18em",
                textTransform: "uppercase", color: "var(--jood-ink-faint)", whiteSpace: "nowrap",
              }}>
                {group.label}
              </p>
              <div style={{ flex: 1, height: "1px", backgroundColor: "var(--jood-line)" }} />
            </div>

            {group.items.map((req) => {
              const statusColor = STATUS_COLOR[req.status] ?? "var(--jood-line)";
              const statusLabel = isAr ? (STATUS_LABEL_AR[req.status] ?? req.status) : (STATUS_LABEL_EN[req.status] ?? req.status);
              const isExpanded = expandedId === req.id;

              return (
                <div key={req.id} style={{ display: "flex", borderBottom: "1px solid var(--jood-line)" }}>
                  {/* Status bar */}
                  <div style={{
                    width: "2px", background: statusColor,
                    margin: "16px 16px 16px 0", borderRadius: "99px",
                    flexShrink: 0, alignSelf: "stretch", transition: "background 300ms",
                  }} />

                  <div style={{ flex: 1, padding: "14px 0" }}>
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}
                    >
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "15px", color: "var(--jood-ink)", lineHeight: 1.5, wordBreak: "break-word" }}>
                          {req.body}
                        </p>
                        {isUrgent(req) && (
                          <p style={{
                            fontFamily: "var(--font-label)", fontSize: "8px", letterSpacing: "0.12em",
                            textTransform: "uppercase", color: "var(--jood-danger)", marginTop: "4px",
                          }}>
                            {isAr ? "عاجل" : "Urgent"}
                          </p>
                        )}
                      </div>

                      <span style={{
                        fontFamily: "var(--font-label)", fontSize: "8px", letterSpacing: "0.12em",
                        textTransform: "uppercase", color: statusColor,
                        border: `1px solid ${statusColor}`, borderRadius: "99px",
                        padding: "3px 8px", whiteSpace: "nowrap", flexShrink: 0,
                      }}>
                        {statusLabel}
                      </span>
                    </div>

                    {/* Admin notes (staff reply) */}
                    {req.admin_notes && (
                      <div style={{
                        marginTop: "10px", borderTop: "1px solid var(--jood-line)", paddingTop: "10px",
                        paddingLeft: "12px", borderLeft: "2px solid var(--jood-garnet)",
                      }}>
                        <p style={{
                          fontFamily: "var(--font-label)", fontSize: "8px", letterSpacing: "0.12em",
                          textTransform: "uppercase", color: "var(--jood-garnet)", marginBottom: "4px",
                        }}>
                          JOOD
                        </p>
                        <p style={{ fontSize: "14px", color: "var(--jood-ink)", lineHeight: 1.5 }}>
                          {req.admin_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
