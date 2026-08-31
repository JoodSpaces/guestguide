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

function fmtShort(iso: string) {
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
      {status}
    </span>
  );
}

function DateBar({ checkIn, checkOut }: { checkIn: string; checkOut: string }) {
  const inMs  = new Date(checkIn).getTime();
  const outMs = new Date(checkOut).getTime();
  const nowMs = Date.now();
  const nights = Math.round((outMs - inMs) / 86400000);
  const isActive = nowMs >= inMs && nowMs <= outMs;
  const pct = isActive ? Math.min(1, (nowMs - inMs) / (outMs - inMs)) : 0;

  return (
    <div style={{ marginTop: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--jood-ink-muted)", fontVariantNumeric: "tabular-nums" }}>{fmtShort(checkIn)}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--jood-ink-ghost)" }}>{nights}n</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--jood-ink-muted)", fontVariantNumeric: "tabular-nums" }}>{fmtShort(checkOut)}</span>
      </div>
      <div style={{ position: "relative", height: "3px", backgroundColor: "var(--jood-line)", borderRadius: "2px" }}>
        {isActive && (
          <>
            <div style={{ position: "absolute", inset: 0, width: `${pct * 100}%`, backgroundColor: "var(--jood-accent)", borderRadius: "2px" }} />
            <div style={{ position: "absolute", top: "50%", left: `${pct * 100}%`, transform: "translate(-50%,-50%)", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--jood-accent)", boxShadow: "0 0 0 2px var(--jood-surface)" }} />
          </>
        )}
      </div>
    </div>
  );
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
        <a href="/admin/bookings/new" style={{ padding: "10px 20px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", borderRadius: "var(--radius-pill)", textDecoration: "none", fontSize: "0.875rem", flexShrink: 0 }}>
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
          style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px 11px 40px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", backgroundColor: "var(--jood-surface)", color: "var(--jood-ink)", fontSize: "0.9375rem", fontFamily: "inherit", outline: "none" }}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--jood-ink-ghost)", fontSize: "1rem", padding: 0 }}>×</button>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "56px 24px", backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)" }}>
          <div style={{ fontSize: "1.75rem", marginBottom: "12px" }}>{query ? "🔍" : "🏠"}</div>
          <p style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--jood-ink)", marginBottom: "6px" }}>
            {query ? `No results for "${query}"` : "No bookings yet"}
          </p>
          <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-ghost)", marginBottom: query ? 0 : "16px" }}>
            {query ? "Try a different name or property" : "Add your first booking to get started"}
          </p>
          {!query && (
            <a href="/admin/bookings/new" style={{ display: "inline-block", padding: "9px 20px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", borderRadius: "var(--radius-pill)", textDecoration: "none", fontSize: "0.875rem" }}>
              + New booking
            </a>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.map((b) => {
          const prop = Array.isArray(b.properties) ? b.properties[0] : b.properties;
          const isActive = b.check_in <= today && b.check_out >= today;
          return (
            <a
              key={b.id}
              href={`/admin/bookings/${b.id}`}
              style={{
                display: "block",
                padding: "16px 20px",
                backgroundColor: isActive ? "var(--jood-surface-raised)" : "var(--jood-surface)",
                border: `1px solid ${isActive ? "var(--jood-accent)" : "var(--jood-line)"}`,
                borderRadius: "var(--radius-lg)",
                opacity: b.status === "cancelled" ? 0.55 : 1,
                textDecoration: "none",
                color: "inherit",
                transition: "border-color 150ms",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "var(--jood-ink)", fontWeight: 500, fontSize: "0.9375rem", marginBottom: "2px" }}>
                    {b.guest_first_name} {b.guest_last_name}
                  </p>
                  <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.8125rem" }}>{prop?.name}</p>
                  <DateBar checkIn={b.check_in} checkOut={b.check_out} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
                  <StatusChip status={b.status} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--jood-ink-ghost)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{b.source}</span>
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {query && filtered.length > 0 && (
        <p style={{ textAlign: "center", marginTop: "16px", fontSize: "0.8rem", color: "var(--jood-ink-ghost)" }}>
          {filtered.length} of {initialBookings.length}
        </p>
      )}
    </div>
  );
}
