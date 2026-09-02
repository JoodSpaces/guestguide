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
  pending:     "var(--jood-accent)",
  approved:    "var(--jood-aqua)",
  paid:        "var(--jood-success)",
  fulfilled:   "var(--jood-ink-ghost)",
  rejected:    "var(--jood-danger)",
  received:    "var(--jood-accent)",
  in_progress: "var(--jood-aqua)",
  resolved:    "var(--jood-ink-ghost)",
};

const CAT_LABELS: Record<string, string> = {
  maintenance: "Maintenance", housekeeping: "Housekeeping",
  supplies: "Supplies", service: "Service booking", other: "Other",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function StatusChip({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "var(--jood-ink-muted)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.1em",
      textTransform: "uppercase", color,
      border: `1px solid ${color}`, borderRadius: "var(--radius-pill)",
      padding: "3px 8px", whiteSpace: "nowrap", flexShrink: 0,
    }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      {status.replace("_", " ")}
    </span>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 24px", backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)" }}>
      <div style={{ fontSize: "1.75rem", marginBottom: "12px" }}>{icon}</div>
      <p style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--jood-ink)", marginBottom: "6px" }}>{title}</p>
      <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-ghost)" }}>{subtitle}</p>
    </div>
  );
}

type Tab = "service" | "guest";

function TabBtn({ t, label, pending, activeTab, setTab }: { t: Tab; label: string; pending: number; activeTab: Tab; setTab: (t: Tab) => void }) {
  const active = activeTab === t;
  return (
    <button
      onClick={() => setTab(t)}
      style={{
        display: "inline-flex", alignItems: "center", gap: "8px",
        padding: "8px 16px",
        borderRadius: "var(--radius-pill)",
        border: `1px solid ${active ? "var(--jood-ink)" : "var(--jood-line)"}`,
        backgroundColor: active ? "var(--jood-ink)" : "transparent",
        color: active ? "var(--jood-ground)" : "var(--jood-ink-muted)",
        fontSize: "0.875rem", cursor: "pointer", fontFamily: "inherit",
        transition: "all 150ms",
      }}
    >
      {label}
      {pending > 0 && (
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          minWidth: "18px", height: "18px", borderRadius: "9px",
          backgroundColor: "var(--jood-danger)",
          color: "white",
          fontSize: "0.6rem", fontFamily: "var(--font-mono)",
          fontWeight: 600, padding: "0 4px",
        }}>
          {pending}
        </span>
      )}
    </button>
  );
}

export function RequestsListClient({
  initialServiceReqs,
  initialGuestReqs,
}: {
  initialServiceReqs: ServiceReq[];
  initialGuestReqs: GuestReq[];
}) {
  const [tab, setTab] = useState<Tab>("guest");
  const [query, setQuery] = useState("");

  const pendingServices = initialServiceReqs.filter((r) => r.status === "pending").length;
  const pendingGuest    = initialGuestReqs.filter((r) => r.status === "received").length;

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

  const card: React.CSSProperties = {
    display: "block",
    backgroundColor: "var(--jood-surface)",
    border: "1px solid var(--jood-line)",
    borderRadius: "var(--radius-lg)",
    padding: "14px 18px",
    textDecoration: "none",
    color: "inherit",
    transition: "border-color 150ms",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h1 className="font-display" style={{ fontSize: "1.8rem" }}>Requests</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <TabBtn t="guest" label="Guest requests" pending={pendingGuest} activeTab={tab} setTab={setTab} />
        <TabBtn t="service" label="Service bookings" pending={pendingServices} activeTab={tab} setTab={setTab} />
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "16px" }}>
        <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--jood-ink-ghost)", fontSize: "0.85rem", pointerEvents: "none" }}>🔍</span>
        <input
          type="text"
          placeholder="Search by guest, property, status…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px 10px 38px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", backgroundColor: "var(--jood-surface)", color: "var(--jood-ink)", fontSize: "0.875rem", fontFamily: "inherit", outline: "none" }}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--jood-ink-ghost)", fontSize: "1rem", padding: 0 }}>×</button>
        )}
      </div>

      {tab === "guest" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {!filteredGuest.length && (
            <EmptyState
              icon={query ? "🔍" : "💬"}
              title={query ? `No results for "${query}"` : "No guest requests yet"}
              subtitle={query ? "Try different keywords" : "Requests from guests will appear here"}
            />
          )}
          {filteredGuest.map((r) => {
            const booking  = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
            const property = booking ? (Array.isArray(booking.properties) ? booking.properties[0] : booking.properties) : null;
            return (
              <a key={r.id} href={`/admin/requests/guest/${r.id}`} style={{ ...card, borderLeft: r.urgency === "urgent" ? "3px solid var(--jood-danger)" : "1px solid var(--jood-line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontFamily: "var(--font-label)", fontSize: "8px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--jood-ink-ghost)", backgroundColor: "var(--jood-surface-raised)", borderRadius: "var(--radius-pill)", padding: "2px 7px" }}>
                        {CAT_LABELS[r.category] ?? r.category}
                      </span>
                      {r.urgency === "urgent" && (
                        <span style={{ fontFamily: "var(--font-label)", fontSize: "8px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--jood-danger)" }}>Urgent</span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.body.slice(0, 80)}{r.body.length > 80 ? "…" : ""}
                    </p>
                    <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>
                      {booking?.guest_first_name} {booking?.guest_last_name} · {(property as { name: string })?.name} · {fmt(r.created_at)}
                    </p>
                  </div>
                  <StatusChip status={r.status} />
                </div>
              </a>
            );
          })}
        </div>
      )}

      {tab === "service" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {!filteredService.length && (
            <EmptyState
              icon={query ? "🔍" : "🛎"}
              title={query ? `No results for "${query}"` : "No service bookings yet"}
              subtitle={query ? "Try different keywords" : "Service bookings from guests will appear here"}
            />
          )}
          {filteredService.map((r) => {
            const booking  = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
            const property = booking ? (Array.isArray(booking.properties) ? booking.properties[0] : booking.properties) : null;
            const totalPrice = (r.services?.price_egp ?? 0) * r.quantity;
            return (
              <a key={r.id} href={`/admin/requests/service/${r.id}`} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.quantity > 1 ? `${r.quantity}× ` : ""}{r.services?.name_en ?? "Service"}
                    </p>
                    <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>
                      {booking?.guest_first_name} {booking?.guest_last_name} · {(property as { name: string })?.name} · {fmt(r.created_at)}
                      {totalPrice > 0 ? ` · ${totalPrice.toLocaleString()} EGP` : " · Free"}
                    </p>
                  </div>
                  <StatusChip status={r.status} />
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
