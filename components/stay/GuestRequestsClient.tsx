"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@supabase/supabase-js";
import { AppIcon } from "@/components/ui/AppIcon";
import { haptic } from "@/lib/haptics";
import { detectEmergency } from "@/lib/emergency-rules";
import { RequestConfirm, type RequestDraft, type RequestCategory } from "@/components/stay/RequestConfirm";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const STATUS_COLOR: Record<string, string> = {
  received:    "var(--jood-ink-muted)",   // the status a new request really starts with (there is no "open")
  open:        "var(--jood-warning)",
  in_progress: "var(--jood-aqua)",
  resolved:    "var(--jood-success)",
  cancelled:   "var(--jood-ink-subtle)",
};

const STATUS_LABEL_EN: Record<string, string> = {
  received:    "Received",
  open:        "Open",
  in_progress: "In progress",
  resolved:    "Resolved",
  cancelled:   "Cancelled",
};
const STATUS_LABEL_AR: Record<string, string> = {
  received:    "تم الاستلام",
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
  const inFlight = useRef(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const classifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [predictedCategory, setPredictedCategory] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmDraft, setConfirmDraft] = useState<RequestDraft | null>(null);

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
        const res = await fetch("/api/guest/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, body }),
        });
        if (res.ok) {
          const { category } = await res.json();
          setPredictedCategory(category);
        }
      } catch {}
    }, 800);
    return () => { if (classifyTimer.current) clearTimeout(classifyTimer.current); };
  }, [body, token]);

  // Pressing Send opens the confirmation card; the request is only made when the guest confirms there.
  function openConfirm() {
    if (!body.trim() || inFlight.current) return;
    const known = ["maintenance", "housekeeping", "supplies", "service", "other"];
    setSendError(null);
    // An emergency is never held behind a card: it goes at once, marked urgent.
    if (detectEmergency(body)) { void submitRequest({ text: body.trim(), category: "maintenance", urgent: true }); return; }
    setConfirmDraft({ text: body.trim(), category: (predictedCategory && known.includes(predictedCategory) ? predictedCategory : "other") as RequestCategory, urgent });
  }

  async function submitRequest(d: RequestDraft) {
    if (!d.text.trim() || inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setSendError(null);
    try {
      const text = d.text.trim();
      const res = await fetch("/api/guest/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, body: text, category: d.category, urgency: d.urgent ? "urgent" : "normal" }),
      }).catch(() => null);
      if (res?.ok) {
        // The server answers with only the id, category and urgency: build the rest here, so the new entry shows its
        // text, status and date straight away (it used to appear blank under "Invalid date" until a reload).
        const created = (await res.json()) as { id: string; category: string; urgency: string };
        const newReq: GuestRequest = {
          id: created.id, category: created.category, urgency: created.urgency, body: text,
          status: "received", admin_notes: null, created_at: new Date().toISOString(),
        };
        setRequests((prev) => (prev.some((r) => r.id === newReq.id) ? prev : [newReq, ...prev]));
        haptic("success");
        setBody("");
        setUrgent(false);
        setPredictedCategory(null);
        setConfirmDraft(null);
      } else if (res?.status === 429) {
        setSendError(isAr ? "رسائل كثيرة في وقت قصير. حاول بعد دقيقة." : "Too many messages in a short time. Please try again in a minute.");
      } else {
        setSendError(isAr ? "تعذّر إرسال طلبك. تحقق من الاتصال وحاول مرة أخرى، أو تواصل مع فريق جود." : "We couldn't send your request. Check your connection and try again, or contact the JOOD team.");
      }
    } finally {
      setSending(false);
      inFlight.current = false;
    }
  }

  const groups = groupByDate(requests, isAr);
  const isUrgent = (r: GuestRequest) => r.urgency === "high" || r.urgency === "emergency";

  return (
    <div>
      {confirmDraft && (
        <RequestConfirm
          isAr={isAr} draft={confirmDraft} source="form" busy={sending} error={sendError}
          onConfirm={(d) => submitRequest(d)} onCancel={() => { if (!sending) setConfirmDraft(null); }}
        />
      )}
      {/* Compose: a glowing sheet, the message, one pill */}
      <section className="req-compose" style={{ "--c1": "#FF8A2A", "--c2": "#FF3FA4" } as React.CSSProperties}>
        <p className="req-kicker">{isAr ? "اكتب لفريق جود" : "Message the JOOD team"}</p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={isAr ? "كيف يمكننا مساعدتك؟" : "How can we help you?"}
          rows={3}
          dir={isAr ? "rtl" : "ltr"}
          aria-label={isAr ? "رسالتك" : "Your message"}
        />
        <div className="req-row">
          <button type="button" className={`req-urgent${urgent ? " on" : ""}`} aria-pressed={urgent} onClick={() => setUrgent((u) => !u)}>
            <span aria-hidden>{urgent ? "●" : "○"}</span> {isAr ? "عاجل" : "Urgent"}
          </button>
          {predictedCategory && predictedCategory !== "other" && <span className="req-cat">{predictedCategory}</span>}
        </div>
        <button type="button" className="vpill" onClick={openConfirm} disabled={sending || !body.trim()} style={{ opacity: body.trim() ? 1 : 0.55 }}>
          <span>{sending ? (isAr ? "جاري الإرسال…" : "Sending…") : (isAr ? "أرسل" : "Send")}</span><i aria-hidden>{isAr ? "←" : "→"}</i>
        </button>
      </section>

      {sendError && (
        <p role="alert" style={{ color: "#FF9C9C", fontSize: "13px", margin: "10px 4px 0", lineHeight: 1.5 }}>{sendError}</p>
      )}

      {/* Your requests */}
      {requests.length === 0 ? (
        <div className="home-note" style={{ marginTop: 14, textAlign: "center" }}>
          <p style={{ color: "var(--jood-ink-muted)", fontSize: 14 }}>{isAr ? "لا توجد طلبات بعد" : "No requests yet. What you send appears here."}</p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.label}>
            <p className="man-label">{group.label}</p>
            {group.items.map((req) => {
              const statusLabel = isAr ? (STATUS_LABEL_AR[req.status] ?? req.status) : (STATUS_LABEL_EN[req.status] ?? req.status);
              const step = req.status === "resolved" ? 2 : req.status === "in_progress" ? 1 : 0;
              const open = expandedId === req.id;
              return (
                <article key={req.id} className="req-card">
                  <button type="button" className="req-head" onClick={() => setExpandedId(open ? null : req.id)} aria-expanded={open}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b>{req.body}</b>
                      {isUrgent(req) && <em>{isAr ? "عاجل" : "Urgent"}</em>}
                    </span>
                    <span className={`req-state s${step}`}>{statusLabel}</span>
                  </button>
                  <div className="req-dots" aria-hidden>
                    {[0, 1, 2].map((i) => <i key={i} className={i <= step ? "on" : ""} />)}
                  </div>
                  {req.admin_notes && (
                    <div className="req-reply">
                      <small>JOOD</small>
                      <p>{req.admin_notes}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
