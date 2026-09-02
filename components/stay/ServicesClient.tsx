"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "use-intl";

const STATUS_COLOR: Record<string, string> = {
  pending:   "var(--jood-warning)",
  approved:  "var(--jood-garnet)",
  paid:      "var(--jood-success)",
  fulfilled: "var(--jood-success)",
  rejected:  "var(--jood-danger)",
};

const CAT_ICON: Record<string, string> = {
  early_checkin: "🌅",
  late_checkout: "🌙",
  transfer:      "🚗",
  housekeeping:  "🧹",
  amenities:     "✨",
  food:          "🍽️",
  other:         "📋",
};

/* Category display labels */
const CAT_LABEL_EN: Record<string, string> = {
  early_checkin: "Arrival",
  late_checkout: "Departure",
  transfer:      "Transport",
  housekeeping:  "Room",
  amenities:     "Amenities",
  food:          "Dining",
  other:         "Other",
};
const CAT_LABEL_AR: Record<string, string> = {
  early_checkin: "الوصول",
  late_checkout: "المغادرة",
  transfer:      "النقل",
  housekeeping:  "الغرفة",
  amenities:     "وسائل الراحة",
  food:          "الطعام",
  other:         "أخرى",
};

interface Service {
  id: string;
  name_en: string;
  name_ar?: string;
  description_en?: string;
  description_ar?: string;
  price_egp: number;
  lead_hours: number;
  category: string;
}

interface ServiceRequest {
  id: string;
  service_id: string | null;
  quantity: number;
  status: string;
  guest_notes: string | null;
  paymob_payment_url: string | null;
  guest_rating?: number | null;
  created_at: string;
  services?: { name_en: string; price_egp: number } | null;
}

interface ServicesClientProps {
  token: string;
  services: Service[];
  myRequests: ServiceRequest[];
}

export function ServicesClient({ token, services: initialServices, myRequests: initialRequests }: ServicesClientProps) {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [myRequests, setMyRequests] = useState(initialRequests);

  // Poll every 15 s for status updates
  useEffect(() => {
    const poll = () =>
      fetch(`/api/guest/services?token=${token}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data?.myRequests) setMyRequests(data.myRequests); })
        .catch(() => {});
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, [token]);

  const [submitting, setSubmitting] = useState<string | null>(null);
  const inFlight = useRef(false);
  const [requested, setRequested] = useState<Set<string>>(
    new Set(initialRequests.map((r) => r.service_id).filter(Boolean) as string[])
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showNotes, setShowNotes] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});

  async function requestService(serviceId: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(serviceId);
    try {
    const res = await fetch("/api/guest/service-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        serviceId,
        quantity: qty[serviceId] ?? 1,
        guestNotes: notes[serviceId] || null,
      }),
    });
    if (res.ok) {
      const { id } = await res.json();
      const svc = initialServices.find((s) => s.id === serviceId);
      setRequested((r) => new Set([...r, serviceId]));
      setMyRequests((prev) => [{
        id, service_id: serviceId, quantity: qty[serviceId] ?? 1,
        status: "pending", guest_notes: notes[serviceId] || null,
        paymob_payment_url: null, created_at: new Date().toISOString(),
        services: svc ? { name_en: svc.name_en, price_egp: svc.price_egp } : null,
      }, ...prev]);
      setShowNotes(null);
    }
    } finally {
      setSubmitting(null);
      inFlight.current = false;
    }
  }

  async function submitRating(requestId: string, rating: number) {
    setRatings((r) => ({ ...r, [requestId]: rating }));
    await fetch(`/api/guest/service-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, rating }),
    }).catch(() => {});
  }

  const name = (svc: Service) => (isAr && svc.name_ar ? svc.name_ar : svc.name_en);
  const desc = (svc: Service) => (isAr && svc.description_ar ? svc.description_ar : svc.description_en);

  if (!initialServices.length) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "var(--jood-ink-muted)" }}>
        <p style={{ fontSize: "1.5rem", marginBottom: "10px" }}>✦</p>
        <p style={{ fontSize: "0.9375rem" }}>{isAr ? "الخدمات قادمة قريباً" : "Services coming soon"}</p>
      </div>
    );
  }

  // Group services by category
  const categories = [...new Set(initialServices.map((s) => s.category))];

  const rule = { borderTop: "1px solid var(--jood-line)" } as const;

  return (
    <div>
      {/* ── Service categories ───────────────────────────────────────────── */}
      {categories.map((cat, catIdx) => {
        const catServices = initialServices.filter((s) => s.category === cat);
        return (
          <div key={cat} style={{ marginTop: catIdx > 0 ? "28px" : "0" }}>
            {/* Category label */}
            <p style={{
              fontFamily: "var(--font-label)",
              fontSize: "8px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--jood-garnet)",
              marginBottom: "12px",
            }}>
              {isAr ? (CAT_LABEL_AR[cat] ?? cat) : (CAT_LABEL_EN[cat] ?? cat)}
            </p>

            {catServices.map((svc) => {
              const isRequested = requested.has(svc.id);
              const isSubmitting = submitting === svc.id;
              const showingNotes = showNotes === svc.id;

              return (
                <div key={svc.id} style={rule}>
                  {/* Main entry row */}
                  <div style={{ display: "flex", alignItems: "flex-start", padding: "15px 0", gap: "16px" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "20px",
                        fontWeight: 400,
                        color: "var(--jood-ink)",
                        lineHeight: 1.1,
                        marginBottom: desc(svc) ? "3px" : "0",
                      }}>
                        {name(svc)}
                      </p>
                      {desc(svc) && (
                        <p style={{ fontSize: "12.5px", color: "var(--jood-mid)", lineHeight: 1.5 }}>
                          {desc(svc)}
                        </p>
                      )}
                    </div>

                    <div style={{ flexShrink: 0, textAlign: isAr ? "left" : "right", display: "flex", flexDirection: "column", alignItems: isAr ? "flex-start" : "flex-end", gap: "6px" }}>
                      <p style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        letterSpacing: "0.02em",
                        color: svc.price_egp === 0 ? "var(--jood-aqua)" : "var(--jood-ink)",
                      }}>
                        {svc.price_egp === 0
                          ? (isAr ? "مجاني" : "Free")
                          : `${svc.price_egp.toLocaleString()} ${isAr ? "ج.م" : "EGP"}`}
                      </p>

                      {isRequested ? (
                        <span style={{
                          fontFamily: "var(--font-label)",
                          fontSize: "8px",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "var(--jood-ink-faint)",
                          border: "1px solid var(--jood-line)",
                          borderRadius: "99px",
                          padding: "4px 9px",
                        }}>
                          {isAr ? "أُرسل" : "Sent"}
                        </span>
                      ) : (
                        <button
                          onClick={() => setShowNotes(showingNotes ? null : svc.id)}
                          disabled={isSubmitting}
                          style={{
                            fontFamily: "var(--font-label)",
                            fontSize: "9px",
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "var(--jood-garnet)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "0",
                          }}
                        >
                          {isAr ? "أضف →" : "Add →"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded notes panel */}
                  {showingNotes && !isRequested && (
                    <div style={{
                      paddingBottom: "16px",
                      borderTop: "1px solid var(--jood-line)",
                      paddingTop: "14px",
                    }}>
                      {/* Quantity stepper */}
                      <div style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
                        <label style={{ fontSize: "12.5px", color: "var(--jood-mid)", fontFamily: "var(--font-body)" }}>
                          {isAr ? "الكمية" : "Quantity"}
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <button
                            onClick={() => setQty((q) => ({ ...q, [svc.id]: Math.max(1, (q[svc.id] ?? 1) - 1) }))}
                            style={{ width: "28px", height: "28px", border: "1px solid var(--jood-line)", borderRadius: "50%", background: "none", cursor: "pointer", fontSize: "1rem", color: "var(--jood-ink)", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >−</button>
                          <span style={{ fontSize: "0.875rem", minWidth: "20px", textAlign: "center", color: "var(--jood-ink)" }}>
                            {qty[svc.id] ?? 1}
                          </span>
                          <button
                            onClick={() => setQty((q) => ({ ...q, [svc.id]: Math.min(10, (q[svc.id] ?? 1) + 1) }))}
                            style={{ width: "28px", height: "28px", border: "1px solid var(--jood-line)", borderRadius: "50%", background: "none", cursor: "pointer", fontSize: "1rem", color: "var(--jood-ink)", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >+</button>
                        </div>
                      </div>

                      <textarea
                        className="jood-textarea"
                        value={notes[svc.id] ?? ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [svc.id]: e.target.value }))}
                        placeholder={isAr ? "ملاحظات (اختياري)" : "Notes (optional)"}
                        style={{ width: "100%", resize: "vertical", minHeight: "60px", boxSizing: "border-box", direction: isAr ? "rtl" : "ltr", marginBottom: "10px" }}
                      />

                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          onClick={() => requestService(svc.id)}
                          disabled={isSubmitting}
                          className="btn btn-primary btn-sm"
                          style={{ opacity: isSubmitting ? 0.5 : 1 }}
                        >
                          {isSubmitting ? (isAr ? "جاري الإرسال…" : "Sending…") : (isAr ? "تأكيد الطلب" : "Confirm")}
                        </button>
                        <button onClick={() => setShowNotes(null)} className="btn btn-ghost btn-sm">
                          {isAr ? "إلغاء" : "Cancel"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* ── My requests ──────────────────────────────────────────────────── */}
      {myRequests.length > 0 && (
        <div style={{ marginTop: "36px", borderTop: "1px solid var(--jood-line)" }}>
          <div style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            padding: "16px 0",
            borderBottom: "1px solid var(--jood-line)",
          }}>
            <p style={{
              fontFamily: "var(--font-display)",
              fontSize: "22px",
              fontWeight: 400,
              fontStyle: "italic",
              color: "var(--jood-ink)",
            }}>
              {isAr ? "طلباتي" : "My requests"}
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--jood-ink-faint)" }}>
              {myRequests.length}
            </p>
          </div>

          {myRequests.map((r) => {
            const svcName = isAr
              ? (initialServices.find((s) => s.id === r.service_id)?.name_ar || r.services?.name_en)
              : r.services?.name_en;
            const hasPayment = r.status === "approved" && r.paymob_payment_url;
            const barColor = STATUS_COLOR[r.status] ?? "var(--jood-line)";

            return (
              <div
                key={r.id}
                style={{ display: "flex", padding: "0", borderBottom: "1px solid var(--jood-line)", gap: "0" }}
              >
                {/* Status bar */}
                <div style={{
                  width: "2px",
                  background: barColor,
                  margin: "16px 16px 16px 0",
                  borderRadius: "99px",
                  flexShrink: 0,
                  alignSelf: "stretch",
                }} />

                <div style={{ flex: 1, padding: "14px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--jood-ink)", marginBottom: hasPayment ? "3px" : "0" }}>
                        {r.quantity > 1 ? `${r.quantity}× ` : ""}{svcName}
                      </p>
                      {hasPayment && (
                        <p style={{ fontSize: "13px", color: "var(--jood-garnet)", marginBottom: "8px" }}>
                          {isAr ? "بانتظار الدفع" : "Awaiting payment"}
                        </p>
                      )}
                      {hasPayment && (
                        <a
                          href={r.paymob_payment_url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-garnet btn-sm"
                          style={{ display: "inline-flex" }}
                        >
                          {isAr ? "ادفع الآن" : "Pay now"}
                        </a>
                      )}
                    </div>

                    <span style={{
                      fontFamily: "var(--font-label)",
                      fontSize: "8px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: STATUS_COLOR[r.status] ?? "var(--jood-ink-faint)",
                      border: "1px solid var(--jood-line)",
                      borderRadius: "99px",
                      padding: "4px 9px",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}>
                      {t(`services.status_${r.status}`, { defaultValue: r.status })}
                    </span>
                  </div>

                  {r.guest_notes && (
                    <p style={{
                      fontSize: "12px",
                      color: "var(--jood-mid)",
                      marginTop: "8px",
                      fontStyle: "italic",
                      borderTop: "1px solid var(--jood-line)",
                      paddingTop: "8px",
                    }}>
                      "{r.guest_notes}"
                    </p>
                  )}

                  {/* Mood pulse — only for fulfilled, unrated requests */}
                  {r.status === "fulfilled" && !r.guest_rating && !ratings[r.id] && (
                    <div style={{
                      marginTop: "12px",
                      paddingTop: "12px",
                      borderTop: "1px solid var(--jood-line)",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}>
                      <p style={{
                        fontFamily: "var(--font-label)", fontSize: "8px",
                        letterSpacing: "0.14em", textTransform: "uppercase",
                        color: "var(--jood-ink-ghost)", flexShrink: 0,
                      }}>
                        {isAr ? "كيف كانت التجربة؟" : "How was it?"}
                      </p>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {([["😞", 1], ["😐", 2], ["😊", 3]] as const).map(([emoji, val]) => (
                          <button
                            key={val}
                            onClick={() => submitRating(r.id, val)}
                            style={{
                              width: "36px", height: "36px",
                              borderRadius: "50%",
                              border: "1px solid var(--jood-line)",
                              background: "var(--jood-surface)",
                              fontSize: "18px",
                              cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "transform 150ms, border-color 150ms",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.borderColor = "var(--jood-ink-muted)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = "var(--jood-line)"; }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Thank-you after rating */}
                  {r.status === "fulfilled" && (r.guest_rating || ratings[r.id]) && (
                    <p style={{
                      marginTop: "10px", paddingTop: "10px",
                      borderTop: "1px solid var(--jood-line)",
                      fontSize: "12px", color: "var(--jood-ink-muted)",
                      fontFamily: "var(--font-label)", letterSpacing: "0.08em",
                    }}>
                      {isAr ? "شكراً على تقييمك ✦" : "Thanks for your feedback ✦"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
