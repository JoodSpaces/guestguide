"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";

interface Service {
  id: string;
  category: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  price_egp: number;
  lead_hours: number;
}

interface MyRequest {
  id: string;
  service_id: string;
  quantity: number;
  status: string;
  guest_notes: string | null;
  paymob_payment_url: string | null;
  created_at: string;
  services: { name_en: string; price_egp: number } | null;
}

interface Props {
  token: string;
  services: Service[];
  myRequests: MyRequest[];
}

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--jood-ink-muted)",
  approved: "var(--jood-warning)",
  paid: "var(--jood-success)",
  fulfilled: "var(--jood-success)",
  rejected: "var(--jood-danger)",
};

const CAT_ICON: Record<string, string> = {
  early_checkin: "🌅",
  late_checkout: "🌙",
  transfer: "🚗",
  housekeeping: "🧹",
  amenities: "✨",
  food: "🍽️",
  other: "📋",
};

const card: React.CSSProperties = {
  backgroundColor: "var(--jood-surface)",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-lg)",
  padding: "16px 20px",
  marginBottom: "10px",
};

export function ServicesClient({ token, services: initialServices, myRequests: initialRequests }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [myRequests, setMyRequests] = useState(initialRequests);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [requested, setRequested] = useState<Set<string>>(new Set(initialRequests.map((r) => r.service_id).filter(Boolean) as string[]));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showNotes, setShowNotes] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});

  async function requestService(serviceId: string) {
    setSubmitting(serviceId);
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
    setSubmitting(null);
    if (res.ok) {
      const { id } = await res.json();
      const svc = initialServices.find((s) => s.id === serviceId);
      setRequested((r) => new Set([...r, serviceId]));
      setMyRequests((prev) => [
        { id, service_id: serviceId, quantity: qty[serviceId] ?? 1, status: "pending", guest_notes: notes[serviceId] || null, paymob_payment_url: null, created_at: new Date().toISOString(), services: svc ? { name_en: svc.name_en, price_egp: svc.price_egp } : null },
        ...prev,
      ]);
      setShowNotes(null);
    }
  }

  const name = (svc: Service) => isAr && svc.name_ar ? svc.name_ar : svc.name_en;
  const desc = (svc: Service) => isAr && svc.description_ar ? svc.description_ar : svc.description_en;

  if (!initialServices.length) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--jood-ink-muted)" }}>
        <p style={{ fontSize: "2rem", marginBottom: "12px" }}>✨</p>
        <p style={{ fontSize: "0.9375rem" }}>Services coming soon</p>
      </div>
    );
  }

  return (
    <div>
      {/* Catalogue */}
      <div style={{ marginBottom: "32px" }}>
        {initialServices.map((svc) => {
          const isRequested = requested.has(svc.id);
          const isSubmitting = submitting === svc.id;
          const showingNotes = showNotes === svc.id;

          return (
            <div key={svc.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "1.1rem" }}>{CAT_ICON[svc.category] ?? "📋"}</span>
                    <p style={{ fontWeight: 500, fontSize: "0.9375rem" }}>{name(svc)}</p>
                  </div>
                  {desc(svc) && <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginBottom: "6px" }}>{desc(svc)}</p>}
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <p style={{ fontSize: "0.875rem", fontWeight: 500, color: svc.price_egp === 0 ? "var(--jood-success)" : "var(--jood-ink)" }}>
                      {svc.price_egp === 0 ? (isAr ? "مجاني" : "Free") : `${svc.price_egp.toLocaleString()} ${isAr ? "ج.م" : "EGP"}`}
                    </p>
                    {svc.lead_hours > 0 && (
                      <p style={{ fontSize: "0.75rem", color: "var(--jood-ink-muted)" }}>
                        {isAr ? `يُحجز قبل ${svc.lead_hours}س` : `Book ${svc.lead_hours}h ahead`}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ flexShrink: 0 }}>
                  {isRequested ? (
                    <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--jood-ink-muted)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", padding: "6px 12px" }}>
                      {isAr ? "مُرسَل" : "Sent"}
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowNotes(showingNotes ? null : svc.id)}
                      disabled={isSubmitting}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "var(--jood-ink)",
                        color: "var(--jood-ground)",
                        border: "none",
                        borderRadius: "var(--radius-pill)",
                        fontSize: "0.8125rem",
                        cursor: "pointer",
                        opacity: isSubmitting ? 0.5 : 1,
                      }}
                    >
                      {isAr ? "طلب" : "Request"}
                    </button>
                  )}
                </div>
              </div>

              {showingNotes && !isRequested && (
                <div style={{ marginTop: "14px", borderTop: "1px solid var(--jood-line)", paddingTop: "14px" }}>
                  <div style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
                    <label style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>{isAr ? "الكمية" : "Quantity"}</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button onClick={() => setQty((q) => ({ ...q, [svc.id]: Math.max(1, (q[svc.id] ?? 1) - 1) }))} style={{ width: "28px", height: "28px", border: "1px solid var(--jood-line)", borderRadius: "50%", background: "none", cursor: "pointer", fontSize: "1rem" }}>−</button>
                      <span style={{ fontSize: "0.875rem", minWidth: "20px", textAlign: "center" }}>{qty[svc.id] ?? 1}</span>
                      <button onClick={() => setQty((q) => ({ ...q, [svc.id]: Math.min(10, (q[svc.id] ?? 1) + 1) }))} style={{ width: "28px", height: "28px", border: "1px solid var(--jood-line)", borderRadius: "50%", background: "none", cursor: "pointer", fontSize: "1rem" }}>+</button>
                    </div>
                  </div>
                  <textarea
                    value={notes[svc.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [svc.id]: e.target.value }))}
                    placeholder={isAr ? "ملاحظات اختيارية…" : "Optional notes…"}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-md)", backgroundColor: "var(--jood-ground)", fontSize: "0.875rem", resize: "vertical", minHeight: "60px", boxSizing: "border-box", color: "var(--jood-ink)", fontFamily: "inherit", direction: isAr ? "rtl" : "ltr", marginBottom: "10px" }}
                  />
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() => requestService(svc.id)}
                      disabled={isSubmitting}
                      style={{ padding: "9px 20px", backgroundColor: "var(--jood-accent)", color: "white", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: "pointer", opacity: isSubmitting ? 0.5 : 1 }}
                    >
                      {isSubmitting ? (isAr ? "جارٍ الإرسال…" : "Sending…") : (isAr ? "تأكيد الطلب" : "Confirm request")}
                    </button>
                    <button onClick={() => setShowNotes(null)} style={{ padding: "9px 14px", background: "none", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: "pointer", color: "var(--jood-ink-muted)" }}>
                      {isAr ? "إلغاء" : "Cancel"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* My orders */}
      {myRequests.length > 0 && (
        <div>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "12px" }}>
            {isAr ? "طلباتي" : "My requests"}
          </p>
          {myRequests.map((r) => {
            const svcName = isAr ? (initialServices.find((s) => s.id === r.service_id)?.name_ar || r.services?.name_en) : r.services?.name_en;
            return (
              <div key={r.id} style={{ ...card, borderLeft: r.status === "approved" && r.paymob_payment_url ? "3px solid var(--jood-warning)" : "1px solid var(--jood-line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "3px" }}>{r.quantity > 1 ? `${r.quantity}× ` : ""}{svcName}</p>
                    {r.status === "approved" && r.paymob_payment_url && (
                      <p style={{ fontSize: "0.8125rem", color: "var(--jood-warning)", marginBottom: "8px" }}>
                        {isAr ? "في انتظار الدفع" : "Awaiting payment"}
                      </p>
                    )}
                  </div>
                  <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: STATUS_COLOR[r.status] ?? "var(--jood-ink-muted)" }}>
                    {r.status === "pending" ? (isAr ? "قيد المراجعة" : "Pending") : r.status === "approved" ? (isAr ? "موافق عليه" : "Approved") : r.status === "paid" ? (isAr ? "مدفوع" : "Paid") : r.status === "fulfilled" ? (isAr ? "تم التنفيذ" : "Done") : r.status}
                  </span>
                </div>
                {r.status === "approved" && r.paymob_payment_url && (
                  <a
                    href={r.paymob_payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-block", marginTop: "8px", padding: "9px 20px", backgroundColor: "var(--jood-accent)", color: "white", borderRadius: "var(--radius-pill)", textDecoration: "none", fontSize: "0.875rem" }}
                  >
                    {isAr ? "ادفع الآن" : "Pay now"} →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
