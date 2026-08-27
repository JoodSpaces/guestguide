"use client";

import { useState } from "react";

interface ServiceReq {
  id: string;
  status: string;
  quantity: number;
  guest_notes: string | null;
  created_at: string;
  services: { name_en: string; price_egp: number } | null;
  bookings: { guest_first_name: string; guest_last_name: string; properties: { name: string } | { name: string }[] } | null;
}

interface GuestReq {
  id: string;
  category: string;
  body: string;
  urgency: string;
  status: string;
  created_at: string;
  bookings: { guest_first_name: string; guest_last_name: string; properties: { name: string } | { name: string }[] } | null;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--jood-warning)",
  approved: "var(--jood-aqua)",
  paid: "var(--jood-success)",
  fulfilled: "var(--jood-ink-ghost)",
  rejected: "var(--jood-danger)",
  received: "var(--jood-warning)",
  in_progress: "var(--jood-aqua)",
  resolved: "var(--jood-ink-ghost)",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const card: React.CSSProperties = {
  display: "block",
  backgroundColor: "var(--jood-surface)",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-lg)",
  padding: "14px 18px",
  textDecoration: "none",
  color: "inherit",
  marginBottom: "8px",
};

type Tab = "service" | "guest";

export function RequestsListClient({
  initialServiceReqs,
  initialGuestReqs,
}: {
  initialServiceReqs: ServiceReq[];
  initialGuestReqs: GuestReq[];
}) {
  const [tab, setTab] = useState<Tab>("guest");
  const CAT_LABELS: Record<string, string> = { maintenance: "Maintenance", housekeeping: "Housekeeping", supplies: "Supplies", service: "Service booking", other: "Other" };

  const tabBtn = (t: Tab, label: string, count: number) => (
    <button
      onClick={() => setTab(t)}
      style={{
        padding: "8px 18px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid",
        borderColor: tab === t ? "var(--jood-ink)" : "var(--jood-line)",
        backgroundColor: tab === t ? "var(--jood-ink)" : "transparent",
        color: tab === t ? "var(--jood-ground)" : "var(--jood-ink-muted)",
        fontSize: "0.875rem",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {label} {count > 0 && <span style={{ opacity: 0.7, fontSize: "0.75rem" }}>({count})</span>}
    </button>
  );

  const pendingServices = initialServiceReqs.filter((r) => r.status === "pending").length;
  const pendingGuest = initialGuestReqs.filter((r) => r.status === "received").length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h1 className="font-display" style={{ fontSize: "1.8rem" }}>Requests</h1>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        {tabBtn("guest", "Guest requests", pendingGuest)}
        {tabBtn("service", "Service bookings", pendingServices)}
      </div>

      {tab === "guest" && (
        <div>
          {!initialGuestReqs.length && (
            <div style={{ ...card, textAlign: "center", padding: "40px", color: "var(--jood-ink-muted)" }}>No guest requests yet</div>
          )}
          {initialGuestReqs.map((r) => {
            const booking = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
            const property = booking ? (Array.isArray(booking.properties) ? booking.properties[0] : booking.properties) : null;
            return (
              <a key={r.id} href={`/admin/requests/guest/${r.id}`} style={{ ...card, borderLeft: r.urgency === "urgent" ? "3px solid var(--jood-danger)" : "1px solid var(--jood-line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, marginRight: "12px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--jood-ink-muted)" }}>{CAT_LABELS[r.category] ?? r.category}</span>
                    </div>
                    <p style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "4px" }}>{r.body.slice(0, 80)}{r.body.length > 80 ? "…" : ""}</p>
                    <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>
                      {booking?.guest_first_name} {booking?.guest_last_name} · {(property as { name: string })?.name} · {fmt(r.created_at)}
                    </p>
                  </div>
                  <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: STATUS_COLOR[r.status], flexShrink: 0 }}>
                    {r.status.replace("_", " ")}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {tab === "service" && (
        <div>
          {!initialServiceReqs.length && (
            <div style={{ ...card, textAlign: "center", padding: "40px", color: "var(--jood-ink-muted)" }}>No service bookings yet</div>
          )}
          {initialServiceReqs.map((r) => {
            const booking = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
            const property = booking ? (Array.isArray(booking.properties) ? booking.properties[0] : booking.properties) : null;
            const totalPrice = (r.services?.price_egp ?? 0) * r.quantity;
            return (
              <a key={r.id} href={`/admin/requests/service/${r.id}`} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, marginRight: "12px" }}>
                    <p style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "4px" }}>
                      {r.quantity > 1 ? `${r.quantity}× ` : ""}{r.services?.name_en ?? "Service"}
                    </p>
                    <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>
                      {booking?.guest_first_name} {booking?.guest_last_name} · {(property as { name: string })?.name} · {fmt(r.created_at)}
                      {totalPrice > 0 ? ` · ${totalPrice.toLocaleString()} EGP` : " · Free"}
                    </p>
                  </div>
                  <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: STATUS_COLOR[r.status], flexShrink: 0 }}>
                    {r.status}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
