"use client";

import { useState } from "react";

interface ServiceRequest {
  id: string;
  status: "pending" | "approved" | "paid" | "fulfilled" | "rejected";
  quantity: number;
  guest_notes: string | null;
  admin_notes: string | null;
  paymob_payment_url: string | null;
  paid_at: string | null;
  fulfilled_at: string | null;
  rejected_at: string | null;
  created_at: string;
  services: { name_en: string; name_ar: string; price_egp: number; description_en: string | null } | null;
  bookings: { guest_first_name: string; guest_last_name: string; guest_email: string | null; properties: { name: string } | { name: string }[] } | null;
}

interface GuestRequest {
  id: string;
  category: string;
  body: string;
  urgency: "normal" | "urgent";
  status: "received" | "in_progress" | "resolved";
  admin_notes: string | null;
  created_at: string;
  bookings: { guest_first_name: string; guest_last_name: string; check_in: string; check_out: string; properties: { name: string } | { name: string }[] } | null;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--jood-ink-muted)",
  approved: "var(--jood-warning)",
  paid: "var(--jood-success)",
  fulfilled: "var(--jood-aqua)",
  rejected: "var(--jood-danger)",
  received: "var(--jood-ink-muted)",
  in_progress: "var(--jood-warning)",
  resolved: "var(--jood-success)",
};

const card: React.CSSProperties = {
  backgroundColor: "var(--jood-surface)",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-lg)",
  padding: "16px 20px",
  marginBottom: "12px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--jood-ground)",
  color: "var(--jood-ink)",
  fontSize: "0.875rem",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function ServiceRequestDetail({ request: initial }: { request: ServiceRequest }) {
  const [req, setReq] = useState(initial);
  const [adminNotes, setAdminNotes] = useState(initial.admin_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const booking = Array.isArray(req.bookings) ? req.bookings[0] : req.bookings;
  const property = booking ? (Array.isArray(booking.properties) ? booking.properties[0] : booking.properties) : null;
  const totalPrice = (req.services?.price_egp ?? 0) * req.quantity;

  async function patch(action?: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/requests/service/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, adminNotes: adminNotes || null }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setReq((r) => ({ ...r, status: data.status ?? r.status, paymob_payment_url: data.paymob_payment_url ?? r.paymob_payment_url, fulfilled_at: data.fulfilled_at ?? r.fulfilled_at, rejected_at: data.rejected_at ?? r.rejected_at }));
    }
  }

  function copyLink() {
    if (!req.paymob_payment_url) return;
    navigator.clipboard.writeText(req.paymob_payment_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ maxWidth: "620px" }}>
      <a href="/admin/requests" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--jood-ink-muted)", textDecoration: "none", fontSize: "0.8125rem", marginBottom: "20px" }}>
        ← Requests
      </a>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--jood-ink-muted)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", padding: "3px 9px" }}>Service request</span>
        <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: STATUS_COLOR[req.status], border: `1px solid ${STATUS_COLOR[req.status]}`, borderRadius: "var(--radius-pill)", padding: "3px 9px" }}>{req.status}</span>
        {req.services?.price_egp === 0 && <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--jood-success)", border: "1px solid var(--jood-success)", borderRadius: "var(--radius-pill)", padding: "3px 9px" }}>Free</span>}
      </div>

      <h1 className="font-display" style={{ fontSize: "1.6rem", marginBottom: "4px" }}>{req.services?.name_en ?? "Service"}</h1>
      <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginBottom: "24px" }}>
        {booking?.guest_first_name} {booking?.guest_last_name} · {property?.name} · {fmt(req.created_at)}
      </p>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "6px" }}>Summary</p>
            <p style={{ fontSize: "0.9375rem" }}>{req.quantity} × {req.services?.name_en}</p>
            {req.services?.description_en && <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginTop: "4px" }}>{req.services.description_en}</p>}
            {req.guest_notes && <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink)", marginTop: "8px", fontStyle: "italic" }}>"{req.guest_notes}"</p>}
          </div>
          {totalPrice > 0 && (
            <p style={{ fontSize: "1.4rem", fontFamily: "var(--font-display)", color: "var(--jood-ink)" }}>{totalPrice.toLocaleString()} EGP</p>
          )}
        </div>
      </div>

      {/* Payment link */}
      {req.paymob_payment_url && req.status !== "rejected" && (
        <div style={{ ...card, borderColor: req.status === "paid" ? "var(--jood-success)" : "var(--jood-warning)" }}>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: req.status === "paid" ? "var(--jood-success)" : "var(--jood-warning)", marginBottom: "10px" }}>
            {req.status === "paid" ? "Payment received" : "Payment link"}
          </p>
          {req.status !== "paid" && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input readOnly value={req.paymob_payment_url} style={{ ...inputStyle, flex: 1, fontSize: "0.75rem", color: "var(--jood-ink-muted)" }} onClick={(e) => (e.target as HTMLInputElement).select()} />
              <button onClick={copyLink} style={{ padding: "9px 14px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.8125rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          )}
          {req.paid_at && <p style={{ fontSize: "0.8125rem", color: "var(--jood-success)" }}>Paid on {fmt(req.paid_at)}</p>}
        </div>
      )}

      {/* Admin notes */}
      <div style={card}>
        <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "10px" }}>Admin notes</p>
        <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Internal notes…" style={{ ...inputStyle, resize: "vertical", minHeight: "70px", marginBottom: "10px" }} />
        <button onClick={() => patch()} disabled={saving} style={{ padding: "8px 16px", backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", fontSize: "0.8125rem", cursor: "pointer" }}>Save notes</button>
      </div>

      {/* Actions */}
      <div style={{ ...card, display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {req.status === "pending" && (
          <>
            <button onClick={() => patch("approve")} disabled={saving} style={{ padding: "10px 20px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
              {totalPrice > 0 ? "Approve + generate payment link" : "Approve"}
            </button>
            <button onClick={() => patch("reject")} disabled={saving} style={{ padding: "10px 20px", backgroundColor: "transparent", color: "var(--jood-danger)", border: "1px solid var(--jood-danger)", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
              Reject
            </button>
          </>
        )}
        {req.status === "approved" && (
          <>
            <button onClick={() => patch("regenerate_link")} disabled={saving} style={{ padding: "10px 20px", backgroundColor: "transparent", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: "pointer", color: "var(--jood-ink-muted)" }}>
              Regenerate link
            </button>
            {totalPrice === 0 && (
              <button onClick={() => patch("fulfill")} disabled={saving} style={{ padding: "10px 20px", backgroundColor: "var(--jood-success)", color: "white", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: "pointer" }}>
                Mark fulfilled
              </button>
            )}
          </>
        )}
        {req.status === "paid" && (
          <button onClick={() => patch("fulfill")} disabled={saving} style={{ padding: "10px 20px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
            Mark fulfilled ✓
          </button>
        )}
        {req.status === "fulfilled" && (
          <p style={{ fontSize: "0.875rem", color: "var(--jood-success)" }}>✓ Fulfilled {req.fulfilled_at ? `on ${fmt(req.fulfilled_at)}` : ""}</p>
        )}
        {req.status === "rejected" && (
          <p style={{ fontSize: "0.875rem", color: "var(--jood-danger)" }}>Rejected {req.rejected_at ? `on ${fmt(req.rejected_at)}` : ""}</p>
        )}
      </div>
    </div>
  );
}

export function GuestRequestDetail({ request: initial }: { request: GuestRequest }) {
  const [req, setReq] = useState(initial);
  const [adminNotes, setAdminNotes] = useState(initial.admin_notes ?? "");
  const [saving, setSaving] = useState(false);

  const booking = Array.isArray(req.bookings) ? req.bookings[0] : req.bookings;
  const property = booking ? (Array.isArray(booking.properties) ? booking.properties[0] : booking.properties) : null;

  async function patch(status?: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/requests/guest/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNotes: adminNotes || null }),
    });
    setSaving(false);
    if (res.ok && status) setReq((r) => ({ ...r, status: status as GuestRequest["status"] }));
  }

  const CAT_LABELS: Record<string, string> = { maintenance: "Maintenance", housekeeping: "Housekeeping", supplies: "Supplies", service: "Service booking", other: "Other" };

  return (
    <div style={{ maxWidth: "620px" }}>
      <a href="/admin/requests" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--jood-ink-muted)", textDecoration: "none", fontSize: "0.8125rem", marginBottom: "20px" }}>
        ← Requests
      </a>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--jood-ink-muted)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", padding: "3px 9px" }}>{CAT_LABELS[req.category] ?? req.category}</span>
        <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: STATUS_COLOR[req.status], border: `1px solid ${STATUS_COLOR[req.status]}`, borderRadius: "var(--radius-pill)", padding: "3px 9px" }}>{req.status.replace("_", " ")}</span>
        {req.urgency === "urgent" && <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--jood-danger)", border: "1px solid var(--jood-danger)", borderRadius: "var(--radius-pill)", padding: "3px 9px" }}>Urgent</span>}
      </div>

      <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginBottom: "16px" }}>
        {booking?.guest_first_name} {booking?.guest_last_name} · {property?.name} · {fmt(req.created_at)}
      </p>

      <div style={{ ...card, backgroundColor: "var(--jood-surface-raised)" }}>
        <p style={{ fontSize: "0.9375rem", lineHeight: 1.7, color: "var(--jood-ink)" }}>{req.body}</p>
      </div>

      <div style={card}>
        <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "10px" }}>Status</p>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          {(["received", "in_progress", "resolved"] as const).map((s) => (
            <button key={s} disabled={saving} onClick={() => patch(s)} style={{ padding: "7px 14px", borderRadius: "var(--radius-pill)", border: `1px solid ${req.status === s ? STATUS_COLOR[s] : "var(--jood-line)"}`, backgroundColor: "transparent", color: req.status === s ? STATUS_COLOR[s] : "var(--jood-ink-muted)", fontSize: "0.8125rem", cursor: "pointer" }}>
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
        <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Internal notes for this request…" style={{ ...inputStyle, resize: "vertical", minHeight: "70px", marginBottom: "10px" }} />
        <button onClick={() => patch()} disabled={saving} style={{ padding: "8px 16px", backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", fontSize: "0.8125rem", cursor: "pointer" }}>Save notes</button>
      </div>
    </div>
  );
}
