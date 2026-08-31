"use client";

import { useState, useMemo } from "react";

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
  const [query, setQuery] = useState("");
  const CAT_LABELS: Record<string, string> = { maintenance: "Maintenance", housekeeping: "Housekeeping", supplies: "Supplies", service: "Service booking", other: "Other" };

  const filteredGuest = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return initialGuestReqs;
    return initialGuestReqs.filter((r) => {
      const booking = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
      const property = booking ? (Array.isArray(booking.properties) ? booking.properties[0] : booking.properties) : null;
      return (
        r.body.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        `${booking?.guest_first_name ?? ""} ${booking?.guest_last_name ?? ""}`.toLowerCase().includes(q) ||
        ((property as { name: string })?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [query, initialGuestReqs]);

  const filteredService = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return initialServiceReqs;
    return initialServiceReqs.filter((r) => {
      const booking = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
      const property = booking ? (Array.isArray(booking.properties) ? booking.properties[0] : booking.properties) : null;
      return (
        (r.services?.name_en ?? "").toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        `${booking?.guest_first_name ?? ""} ${booking?.guest_last_name ?? ""}`.toLowerCase().includes(q) ||
        ((property as { name: string })?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [query, initialServiceReqs]);

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

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        {tabBtn("guest", "Guest requests", pendingGuest)}
        {tabBtn("service", "Service bookings", pendingServices)}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "16px" }}>
        <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--jood-ink-ghost)", fontSize: "0.85rem", pointerEvents: "none" }}>🔍</span>
        <input
          type="text"
          placeholder="Search by guest, property, status…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "10px 14px 10px 38px",
            border: "1px solid var(--jood-line)",
            borderRadius: "var(--radius-pill)",
            backgroundColor: "var(--jood-surface)",
            color: "var(--jood-ink)",
            fontSize: "0.875rem",
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--jood-ink-ghost)", fontSize: "1rem", padding: 0 }}>×</button>
        )}
      </div>

      {tab === "guest" && (
        <div>
          {!filteredGuest.length && (
            <div style={{ ...card, textAlign: "center", padding: "40px", color: "var(--jood-ink-muted)" }}>
              {query ? `No requests matching "${query}"` : "No guest requests yet"}
            </div>
          )}
          {filteredGuest.map((r) => {
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
          {!filteredService.length && (
            <div style={{ ...card, textAlign: "center", padding: "40px", color: "var(--jood-ink-muted)" }}>
              {query ? `No bookings matching "${query}"` : "No service bookings yet"}
            </div>
          )}
          {filteredService.map((r) => {
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
