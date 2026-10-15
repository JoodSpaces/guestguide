"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "use-intl";
import { AppIcon } from "@/components/ui/AppIcon";

const STATUS_COLOR: Record<string, string> = {
  pending:   "var(--jood-warning)",
  approved:  "var(--jood-garnet)",
  paid:      "var(--jood-success)",
  fulfilled: "var(--jood-success)",
  rejected:  "var(--jood-danger)",
};

const CAT_ICON: Record<string, string> = {
  early_checkin: "early_checkin", late_checkout: "late_checkout", transfer: "transfer", housekeeping: "housekeeping",
  amenities: "amenities", food: "food", other: "other",
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const [requested, setRequested] = useState<Set<string>>(
    new Set(initialRequests.map((r) => r.service_id).filter(Boolean) as string[])
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showNotes, setShowNotes] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<string>("all");

  async function requestService(serviceId: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(serviceId);
    setSubmitError(null);
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
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setSubmitError(body.error ?? `Error ${res.status}`);
      }
    } catch {
      setSubmitError("Network error — please try again");
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
        <p style={{ marginBottom: "10px", color: "var(--jood-ink-subtle)", display: "flex", justifyContent: "center" }}><AppIcon name="ai" size={28} /></p>
        <p style={{ fontSize: "0.9375rem" }}>{isAr ? "الخدمات قادمة قريباً" : "Services coming soon"}</p>
      </div>
    );
  }

  // Services as tiles (a colour per category); a tapped tile opens its own sheet with the price, the quantity and one pill.
  const categories = [...new Set(initialServices.map((s) => s.category))];
  const PALETTE: [string, string][] = [["#16E0B0", "#0A6E6A"], ["#5B7BFF", "#2B2FB0"], ["#FF8A2A", "#B8321A"], ["#FF3FA4", "#7A1FA8"], ["#9BD6E0", "#2B6C86"], ["#FFD35B", "#B8721A"]];
  const glow = (cat: string) => {
    const [c1, c2] = PALETTE[Math.max(0, categories.indexOf(cat)) % PALETTE.length];
    return { "--c1": c1, "--c2": c2 } as React.CSSProperties;
  };
  const shown = filter === "all" ? initialServices : initialServices.filter((s) => s.category === filter);
  const active = initialServices.find((s) => s.id === showNotes) ?? null;
  const price = (svc: Service) => (svc.price_egp === 0 ? (isAr ? "مجاني" : "Free") : `${svc.price_egp.toLocaleString()} ${isAr ? "ج.م" : "EGP"}`);
  const STEPS = ["pending", "approved", "paid", "fulfilled"];

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      {categories.length > 1 && (
        <div className="svc-pills" role="tablist" aria-label={isAr ? "الفئة" : "Category"}>
          <button type="button" role="tab" aria-selected={filter === "all"} onClick={() => setFilter("all")}>{isAr ? "الكل" : "All"}</button>
          {categories.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={filter === c} onClick={() => setFilter(c)}>
              {isAr ? (CAT_LABEL_AR[c] ?? c) : (CAT_LABEL_EN[c] ?? c)}
            </button>
          ))}
        </div>
      )}

      <div className="home-grid">
        {shown.map((svc) => {
          const isRequested = requested.has(svc.id);
          return (
            <button key={svc.id} type="button" className="home-card" style={{ ...glow(svc.category), textAlign: "start", border: 0, cursor: "pointer", font: "inherit", minHeight: 150 }}
              onClick={() => { setShowNotes(svc.id); setSubmitError(null); }}>
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, width: "100%" }}>
                <span className="home-ic"><AppIcon name={CAT_ICON[svc.category] ?? "other"} size={18} /></span>
                {isRequested && <span className="svc-sent">{isAr ? "أُرسل" : "Sent"}</span>}
              </span>
              <span style={{ width: "100%" }}>
                <b>{name(svc)}</b>
                <small>{price(svc)}</small>
              </span>
            </button>
          );
        })}
      </div>

      {/* The sheet for one service */}
      {active && (
        <div className="svc-wrap" role="dialog" aria-modal="true" aria-label={name(active)}>
          <button type="button" className="svc-scrim" aria-label={isAr ? "إغلاق" : "Close"} onClick={() => { setShowNotes(null); setSubmitError(null); }} />
          <section className="svc-sheet">
            <div className="svc-glow" style={glow(active.category)} aria-hidden />
            <div className="svc-grab" aria-hidden />
            <p className="req-kicker" style={{ position: "relative" }}>{isAr ? (CAT_LABEL_AR[active.category] ?? active.category) : (CAT_LABEL_EN[active.category] ?? active.category)}</p>
            <h2 className="svc-title">{name(active)}</h2>
            {desc(active) && <p className="svc-desc">{desc(active)}</p>}

            <div className="svc-price">
              <b>{active.price_egp === 0 ? (isAr ? "مجاني" : "Free") : (active.price_egp * (qty[active.id] ?? 1)).toLocaleString()}</b>
              {active.price_egp > 0 && <small>{isAr ? "ج.م" : "EGP"}</small>}
              {active.lead_hours > 0 && <small style={{ marginInlineStart: "auto" }}>{isAr ? `يلزم ${active.lead_hours} ساعة` : `${active.lead_hours}h notice`}</small>}
            </div>

            {requested.has(active.id) ? (
              <p className="svc-done">{isAr ? "تم إرسال طلبك. ستجده في طلباتي أدناه." : "Your request is sent. You will find it under My requests."}</p>
            ) : (
              <>
                <div className="svc-qty">
                  <span>{isAr ? "الكمية" : "Quantity"}</span>
                  <div>
                    <button type="button" onClick={() => setQty((q) => ({ ...q, [active.id]: Math.max(1, (q[active.id] ?? 1) - 1) }))} aria-label="−">−</button>
                    <b>{qty[active.id] ?? 1}</b>
                    <button type="button" onClick={() => setQty((q) => ({ ...q, [active.id]: Math.min(10, (q[active.id] ?? 1) + 1) }))} aria-label="+">+</button>
                  </div>
                </div>
                <textarea
                  className="svc-notes"
                  value={notes[active.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [active.id]: e.target.value }))}
                  placeholder={isAr ? "ملاحظات (اختياري)" : "Notes (optional)"}
                  dir={isAr ? "rtl" : "ltr"}
                />
                {submitError && submitting === null && <p role="alert" style={{ color: "#FF9C9C", fontSize: 13, margin: "0 0 10px" }}>{submitError}</p>}
                <button type="button" className="vpill" disabled={submitting === active.id} onClick={() => requestService(active.id)} style={{ background: "#fff", color: "#0E0908", boxShadow: "none" }}>
                  <span>{submitting === active.id ? (isAr ? "جاري الإرسال…" : "Sending…") : (isAr ? "تأكيد الطلب" : "Confirm request")}</span>
                  <i aria-hidden style={{ background: "#0E0908", color: "#fff" }}>{isAr ? "←" : "→"}</i>
                </button>
              </>
            )}
          </section>
        </div>
      )}

      {/* My requests */}
      {myRequests.length > 0 && (
        <>
          <p className="man-label">{isAr ? "طلباتي" : "My requests"} · {myRequests.length}</p>
          {myRequests.map((r) => {
            const svcName = isAr
              ? (initialServices.find((s) => s.id === r.service_id)?.name_ar || r.services?.name_en)
              : r.services?.name_en;
            const hasPayment = r.status === "approved" && r.paymob_payment_url;
            const step = Math.max(0, STEPS.indexOf(r.status));
            return (
              <article key={r.id} className="req-card">
                <div className="req-head" style={{ cursor: "default" }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b>{r.quantity > 1 ? `${r.quantity}× ` : ""}{svcName}</b>
                    {hasPayment && <em style={{ color: "#FFB59E" }}>{isAr ? "بانتظار الدفع" : "Awaiting payment"}</em>}
                  </span>
                  <span className={`req-state s${r.status === "fulfilled" || r.status === "paid" ? 2 : r.status === "approved" ? 1 : 0}`}>
                    {t(`services.status_${r.status}`, { defaultValue: r.status })}
                  </span>
                </div>
                {r.status !== "rejected" && <div className="req-dots" aria-hidden>{STEPS.map((_, i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>}
                {hasPayment && (
                  <a href={r.paymob_payment_url!} target="_blank" rel="noopener noreferrer" className="vpill" style={{ marginTop: 12, textDecoration: "none", background: "#fff", color: "#0E0908", boxShadow: "none" }}>
                    <span>{isAr ? "ادفع الآن" : "Pay now"}</span><i aria-hidden style={{ background: "#0E0908", color: "#fff" }}>{isAr ? "←" : "→"}</i>
                  </a>
                )}
                {r.guest_notes && <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--jood-ink-muted)", fontStyle: "italic" }}>&ldquo;{r.guest_notes}&rdquo;</p>}
                {r.status === "fulfilled" && !r.guest_rating && !ratings[r.id] && (
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--jood-ink-muted)" }}>{isAr ? "كيف كانت التجربة؟" : "How was it?"}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {([["😞", 1], ["😐", 2], ["😊", 3]] as const).map(([emoji, val]) => (
                        <button key={val} type="button" onClick={() => submitRating(r.id, val)} className="svc-mood" aria-label={String(val)}>{emoji}</button>
                      ))}
                    </div>
                  </div>
                )}
                {r.status === "fulfilled" && (r.guest_rating || ratings[r.id]) && (
                  <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--jood-ink-muted)" }}>{isAr ? "شكراً على تقييمك" : "Thanks for your feedback"}</p>
                )}
              </article>
            );
          })}
        </>
      )}
    </div>
  );
}
