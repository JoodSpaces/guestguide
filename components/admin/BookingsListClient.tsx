"use client";

import { useState, useMemo } from "react";

export interface Booking {
  id: string;
  guest_first_name: string;
  guest_last_name: string;
  check_in: string;
  check_out: string;
  status: string;
  source: string;
  properties: { name: string } | { name: string }[];
}

const STATUS_COLOR: Record<string, string> = {
  confirmed: "var(--jood-accent)",
  cancelled: "var(--jood-danger)",
  completed: "var(--jood-ink-muted)",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function BookingsListClient({ initialBookings }: { initialBookings: Booking[] }) {
  const [query, setQuery] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return initialBookings;
    return initialBookings.filter((b) => {
      const prop = Array.isArray(b.properties) ? b.properties[0] : b.properties;
      return (
        `${b.guest_first_name} ${b.guest_last_name}`.toLowerCase().includes(q) ||
        (prop?.name ?? "").toLowerCase().includes(q) ||
        b.status.toLowerCase().includes(q) ||
        b.source.toLowerCase().includes(q)
      );
    });
  }, [query, initialBookings]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", gap: "16px", flexWrap: "wrap" }}>
        <h1 className="font-display" style={{ fontSize: "1.8rem" }}>Bookings</h1>
        <a
          href="/admin/bookings/new"
          style={{ padding: "10px 20px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", borderRadius: "var(--radius-pill)", textDecoration: "none", fontSize: "0.875rem", flexShrink: 0 }}
        >
          + New booking
        </a>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "20px" }}>
        <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--jood-ink-ghost)", fontSize: "0.9rem", pointerEvents: "none" }}>🔍</span>
        <input
          type="text"
          placeholder="Search by guest name, property, status…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "11px 14px 11px 40px",
            border: "1px solid var(--jood-line)",
            borderRadius: "var(--radius-pill)",
            backgroundColor: "var(--jood-surface)",
            color: "var(--jood-ink)",
            fontSize: "0.9375rem",
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--jood-ink-ghost)", fontSize: "1rem", padding: 0 }}>
            ×
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--jood-ink-muted)" }}>
          <p style={{ fontSize: "1.5rem", marginBottom: "8px" }}>🔍</p>
          <p style={{ fontSize: "0.9375rem" }}>
            {query ? `No bookings matching "${query}"` : "No bookings yet."}
          </p>
          {!query && (
            <a href="/admin/bookings/new" style={{ display: "inline-block", marginTop: "12px", fontSize: "0.875rem", color: "var(--jood-accent)", textDecoration: "underline", textUnderlineOffset: "3px" }}>
              Create your first booking →
            </a>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.map((b) => {
          const prop = Array.isArray(b.properties) ? b.properties[0] : b.properties;
          const statusColor = STATUS_COLOR[b.status] ?? "var(--jood-ink-muted)";
          const isActive = b.check_in <= today && b.check_out >= today;
          return (
            <a
              key={b.id}
              href={`/admin/bookings/${b.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: "16px",
                padding: "16px 20px",
                backgroundColor: isActive ? "var(--jood-surface-raised)" : "var(--jood-surface)",
                border: `1px solid ${isActive ? "var(--jood-accent)" : "var(--jood-line)"}`,
                borderRadius: "var(--radius-lg)",
                opacity: b.status === "cancelled" ? 0.5 : 1,
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
                transition: "border-color 150ms",
              }}
            >
              <div>
                <p style={{ color: "var(--jood-ink)", fontWeight: 500, fontSize: "0.9375rem", marginBottom: "4px" }}>
                  {b.guest_first_name} {b.guest_last_name}
                </p>
                <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.8125rem" }}>
                  {prop?.name} · {fmt(b.check_in)} → {fmt(b.check_out)}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: statusColor }}>
                  {isActive ? "● " : ""}{b.status}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.08em", color: "var(--jood-ink-muted)", opacity: 0.55, textTransform: "uppercase" }}>
                  {b.source}
                </span>
              </div>
            </a>
          );
        })}
      </div>

      {query && filtered.length > 0 && (
        <p style={{ textAlign: "center", marginTop: "16px", fontSize: "0.8rem", color: "var(--jood-ink-ghost)" }}>
          {filtered.length} of {initialBookings.length} bookings
        </p>
      )}
    </div>
  );
}
