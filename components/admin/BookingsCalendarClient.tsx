"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";

export interface Booking {
  id: string;
  guest_first_name: string;
  guest_last_name: string;
  check_in: string;
  check_out: string;
  status: string;
  source: string;
  property_id: string;
  properties: { id: string; name: string } | { id: string; name: string }[];
}

interface Props {
  initialBookings: Booking[];
  properties: { id: string; name: string }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────
function propName(b: Booking): string {
  const p = Array.isArray(b.properties) ? b.properties[0] : b.properties;
  return p?.name ?? "";
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

function dayISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function nightCount(ci: string, co: string): number {
  return Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000);
}

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function fmtFull(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

// Does a booking touch a given ISO date?
type DayRole = "checkin" | "staying" | "checkout";

function roleOnDay(b: Booking, iso: string): DayRole | null {
  const ci = b.check_in.slice(0, 10);
  const co = b.check_out.slice(0, 10);
  if (iso < ci || iso > co) return null;
  if (iso === ci) return "checkin";
  if (iso === co) return "checkout";
  return "staying";
}

// Relative label for list view
function relLabel(ci: string, co: string, todayISO: string): { label: string; urgent: boolean } {
  if (ci.slice(0, 10) <= todayISO && co.slice(0, 10) >= todayISO)
    return { label: "Active", urgent: true };
  const diff = new Date(ci).getTime() - new Date(todayISO).getTime();
  if (diff > 0) {
    const days = Math.ceil(diff / 86400000);
    return { label: days === 1 ? "Tomorrow" : `In ${days}d`, urgent: days <= 2 };
  }
  return { label: `${Math.ceil((new Date(todayISO).getTime() - new Date(co).getTime()) / 86400000)}d ago`, urgent: false };
}

// ── Design tokens ─────────────────────────────────────────────────────────
const STATUS_DOT: Record<string, string> = {
  confirmed: "var(--jood-ink)",
  paid:      "var(--jood-info)",
  pending:   "var(--jood-accent)",
  completed: "var(--jood-ink-ghost)",
  cancelled: "var(--jood-line)",
};

const ROLE_META: Record<DayRole, { label: string; color: string }> = {
  checkin:  { label: "Check-in",   color: "var(--jood-garnet)" },
  staying:  { label: "Staying",    color: "var(--jood-ink-muted)" },
  checkout: { label: "Check-out",  color: "var(--jood-ink-ghost)" },
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DOW = ["S","M","T","W","T","F","S"];

// ── Component ─────────────────────────────────────────────────────────────
export function BookingsCalendarClient({ initialBookings }: Props) {
  const now       = new Date();
  const todayISO  = now.toISOString().slice(0, 10);
  const todayDate = now.getDate();

  const [anchor,  setAnchor]  = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selDay,  setSelDay]  = useState<number | null>(todayDate);
  const [view,    setView]    = useState<"calendar" | "list">("calendar");
  const [query,   setQuery]   = useState("");

  const yr  = anchor.getFullYear();
  const mo  = anchor.getMonth();
  const dim = daysInMonth(yr, mo);
  const isCurMonth = yr === now.getFullYear() && mo === now.getMonth();

  // Grid cells: padding cells for first-week offset, then actual days
  const firstDow = new Date(yr, mo, 1).getDay(); // 0=Sun
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Per-day booking dots map
  const dotMap = new Map<string, Booking[]>();
  for (let d = 1; d <= dim; d++) {
    const iso = dayISO(yr, mo, d);
    dotMap.set(iso, initialBookings.filter(
      (b) => roleOnDay(b, iso) !== null && b.status !== "cancelled"
    ));
  }

  // Bookings on selected day
  const selISO = selDay !== null ? dayISO(yr, mo, selDay) : null;
  const selBookings = selISO
    ? initialBookings
        .map((b) => ({ b, role: roleOnDay(b, selISO) }))
        .filter((x): x is { b: Booking; role: DayRole } => x.role !== null)
        .sort((a, b) => {
          const o: Record<DayRole, number> = { checkin: 0, staying: 1, checkout: 2 };
          return o[a.role] - o[b.role];
        })
    : [];

  // Upcoming for the strip / list view
  const upcoming = initialBookings
    .filter((b) => b.check_out.slice(0, 10) >= todayISO && b.status !== "cancelled")
    .sort((a, b) => a.check_in.localeCompare(b.check_in));

  const q = query.toLowerCase().trim();
  const searchResults = q
    ? initialBookings.filter((b) =>
        `${b.guest_first_name} ${b.guest_last_name}`.toLowerCase().includes(q) ||
        propName(b).toLowerCase().includes(q) ||
        b.status.toLowerCase().includes(q)
      )
    : [...initialBookings].sort((a, b) => a.check_in.localeCompare(b.check_in));

  function goMonth(n: number) {
    setAnchor((a) => addMonths(a, n));
    setSelDay(null);
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: "520px", margin: "0 auto" }}>

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <p style={styles.eyebrow}>Admin · Reservations</p>
          <h1 style={styles.displayTitle}>Bookings</h1>
        </div>
        <Link href="/admin/bookings/new" style={styles.fab}>+</Link>
      </div>

      {/* ── View toggle ────────────────────────────────────────────── */}
      <div style={styles.segmentedControl}>
        {(["calendar", "list"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} style={{
            ...styles.segmentBtn,
            backgroundColor: view === v ? "var(--jood-surface)" : "transparent",
            color: view === v ? "var(--jood-ink)" : "var(--jood-ink-ghost)",
            boxShadow: view === v ? "0 1px 4px rgba(37,20,19,0.10)" : "none",
          }}>
            {v === "calendar" ? "Calendar" : "All bookings"}
          </button>
        ))}
      </div>

      {/* ════════════ CALENDAR VIEW ════════════════════════════════════ */}
      {view === "calendar" && (
        <div>
          {/* Month navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <button onClick={() => goMonth(-1)} style={styles.navBtn}>‹</button>

            <div style={{ textAlign: "center" }}>
              <p style={styles.monthLabel}>{MONTH_NAMES[mo]}</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--jood-ink-ghost)", marginTop: "2px" }}>
                {yr}
              </p>
            </div>

            <button onClick={() => goMonth(1)} style={styles.navBtn}>›</button>
          </div>

          {/* Calendar grid */}
          <div style={{
            border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)",
            overflow: "hidden", marginBottom: "20px",
          }}>
            {/* Day-of-week header */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
              backgroundColor: "var(--jood-surface-raised)",
              borderBottom: "1px solid var(--jood-line)",
            }}>
              {DOW.map((d, i) => (
                <div key={i} style={{
                  textAlign: "center", padding: "10px 0",
                  fontFamily: "var(--font-label)", fontSize: "9px",
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: i === 0 || i === 6 ? "var(--jood-accent)" : "var(--jood-ink-ghost)",
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells — gap technique for crisp grid lines */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
              gap: "1px", backgroundColor: "var(--jood-line)",
            }}>
              {cells.map((day, idx) => {
                if (day === null) {
                  return (
                    <div key={`e-${idx}`} style={{
                      minHeight: "58px",
                      backgroundColor: "var(--jood-surface)",
                      opacity: 0.4,
                    }} />
                  );
                }

                const iso       = dayISO(yr, mo, day);
                const isToday   = isCurMonth && day === todayDate;
                const isSel     = selDay === day;
                const dow       = (firstDow + day - 1) % 7;
                const isWeekend = dow === 0 || dow === 6;
                const dots      = dotMap.get(iso) ?? [];

                // Cell background priority: selected > today > weekend > default
                const cellBg = isSel
                  ? "var(--jood-ink)"
                  : isToday
                  ? "rgba(115,54,53,0.07)"
                  : isWeekend
                  ? "rgba(0,0,0,0.018)"
                  : "var(--jood-surface)";

                return (
                  <button
                    key={day}
                    onClick={() => setSelDay(isSel ? null : day)}
                    style={{
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "space-between",
                      minHeight: "58px", padding: "8px 0 6px",
                      backgroundColor: cellBg,
                      border: "none", cursor: "pointer",
                      transition: "background-color 120ms",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {/* Day number */}
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: "13px",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: isToday ? 700 : 400,
                      color: isSel
                        ? "var(--jood-ground)"
                        : isToday
                        ? "var(--jood-garnet)"
                        : isWeekend ? "var(--jood-ink-muted)" : "var(--jood-ink)",
                    }}>
                      {day}
                    </span>

                    {/* Middle spacer / today pip */}
                    {isToday && !isSel ? (
                      <span style={{
                        width: "4px", height: "4px", borderRadius: "50%",
                        backgroundColor: "var(--jood-garnet)",
                      }} />
                    ) : (
                      <span style={{ height: "4px" }} />
                    )}

                    {/* Booking dots */}
                    <div style={{ display: "flex", gap: "2px", alignItems: "center", minHeight: "7px" }}>
                      {dots.slice(0, 3).map((b, i) => (
                        <span key={b.id + i} style={{
                          width: "5px", height: "5px", borderRadius: "50%",
                          backgroundColor: isSel
                            ? "rgba(245,244,237,0.55)"
                            : STATUS_DOT[b.status] ?? "var(--jood-ink)",
                          flexShrink: 0,
                        }} />
                      ))}
                      {dots.length > 3 && (
                        <span style={{
                          fontSize: "8px", lineHeight: 1,
                          color: isSel ? "rgba(245,244,237,0.55)" : "var(--jood-ink-ghost)",
                          fontFamily: "var(--font-mono)",
                        }}>
                          +{dots.length - 3}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Selected day panel ─────────────────────────────────── */}
          {selISO && (
            <div style={{
              border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)",
              overflow: "hidden", marginBottom: "24px",
              backgroundColor: "var(--jood-surface)",
            }}>
              {/* Panel header */}
              <div style={{
                display: "flex", alignItems: "flex-start",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderBottom: selBookings.length > 0 ? "1px solid var(--jood-line)" : "none",
              }}>
                <div>
                  <p style={{ ...styles.eyebrow, marginBottom: "3px" }}>
                    {new Date(yr, mo, selDay!).toLocaleDateString("en-GB", { weekday: "long" })}
                  </p>
                  <p style={{
                    fontFamily: "var(--font-body)", fontSize: "1rem",
                    fontWeight: 500, color: "var(--jood-ink)",
                  }}>
                    {new Date(yr, mo, selDay!).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
                  </p>
                </div>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: "11px",
                  color: selBookings.length > 0 ? "var(--jood-ink-muted)" : "var(--jood-line)",
                  paddingTop: "2px",
                }}>
                  {selBookings.length > 0
                    ? `${selBookings.length} booking${selBookings.length > 1 ? "s" : ""}`
                    : "Vacant"}
                </span>
              </div>

              {selBookings.length === 0 && (
                <div style={{ padding: "20px 16px" }}>
                  <p style={{ fontSize: "0.875rem", color: "var(--jood-ink-ghost)" }}>
                    No bookings on this date.
                  </p>
                </div>
              )}

              {/* Booking cards for selected day */}
              {selBookings.map(({ b, role }, i) => {
                const nights = nightCount(b.check_in, b.check_out);
                const meta   = ROLE_META[role];
                return (
                  <Link
                    key={b.id}
                    href={`/admin/bookings/${b.id}`}
                    style={{
                      display: "block", padding: "14px 16px", textDecoration: "none",
                      borderTop: i > 0 ? "1px solid var(--jood-line)" : "none",
                      transition: "background-color 100ms",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--jood-surface-raised)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
                  >
                    {/* Role + status row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{
                          width: "6px", height: "6px", borderRadius: "50%",
                          backgroundColor: meta.color, flexShrink: 0,
                        }} />
                        <span style={{
                          fontFamily: "var(--font-label)", fontSize: "8.5px",
                          letterSpacing: "0.16em", textTransform: "uppercase",
                          color: meta.color,
                        }}>
                          {meta.label}
                        </span>
                      </div>
                      <span style={{
                        fontFamily: "var(--font-label)", fontSize: "8px",
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        color: STATUS_DOT[b.status] ?? "var(--jood-ink)",
                        border: `1px solid ${STATUS_DOT[b.status] ?? "var(--jood-ink)"}`,
                        borderRadius: "var(--radius-pill)", padding: "2px 7px",
                        opacity: 0.75,
                      }}>
                        {b.status}
                      </span>
                    </div>

                    {/* Guest name */}
                    <p style={{
                      fontFamily: "var(--font-body)", fontSize: "1rem",
                      fontWeight: 600, color: "var(--jood-ink)", marginBottom: "3px",
                    }}>
                      {b.guest_first_name} {b.guest_last_name}
                    </p>

                    {/* Property + meta */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>
                        {propName(b)}
                      </p>
                      <p style={{
                        fontFamily: "var(--font-mono)", fontSize: "10px",
                        color: "var(--jood-ink-ghost)",
                      }}>
                        {fmtShort(b.check_in)} → {fmtShort(b.check_out)} · {nights}n
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* ── Today shortcut (when on a different month) ──────────── */}
          {!isCurMonth && (
            <button
              onClick={() => {
                setAnchor(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelDay(todayDate);
              }}
              style={{
                display: "block", width: "100%",
                padding: "11px", marginBottom: "20px",
                border: "1px solid var(--jood-garnet)",
                borderRadius: "var(--radius-pill)",
                background: "transparent", cursor: "pointer",
                fontFamily: "var(--font-label)", fontSize: "9px",
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: "var(--jood-garnet)",
                transition: "background-color 150ms",
              }}
            >
              Back to today
            </button>
          )}

          {/* ── Upcoming strip ──────────────────────────────────────── */}
          {upcoming.length > 0 && (
            <>
              <p style={{ ...styles.eyebrow, marginBottom: "10px" }}>Upcoming</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {upcoming.slice(0, 5).map((b) => {
                  const rl = relLabel(b.check_in, b.check_out, todayISO);
                  return (
                    <Link
                      key={b.id}
                      href={`/admin/bookings/${b.id}`}
                      style={styles.upcomingCard(rl.urgent)}
                      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.97)")}
                      onMouseLeave={(e) => (e.currentTarget.style.filter = "")}
                    >
                      <div style={{
                        width: "8px", height: "8px", borderRadius: "50%",
                        backgroundColor: STATUS_DOT[b.status] ?? "var(--jood-ink)",
                        flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 500, fontSize: "0.9rem", color: "var(--jood-ink)", lineHeight: 1.3 }}>
                          {b.guest_first_name} {b.guest_last_name}
                        </p>
                        <p style={{ fontSize: "0.8rem", color: "var(--jood-ink-muted)", marginTop: "1px" }}>
                          {propName(b)} · {fmtShort(b.check_in)}–{fmtShort(b.check_out)}
                        </p>
                      </div>
                      <span style={{
                        fontFamily: "var(--font-label)", fontSize: "8px",
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        color: rl.urgent ? "var(--jood-garnet)" : "var(--jood-ink-ghost)",
                        border: `1px solid ${rl.urgent ? "var(--jood-garnet)" : "var(--jood-line)"}`,
                        borderRadius: "var(--radius-pill)", padding: "3px 8px",
                        flexShrink: 0,
                      }}>
                        {rl.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
              {upcoming.length > 5 && (
                <button
                  onClick={() => setView("list")}
                  style={{
                    display: "block", width: "100%", marginTop: "8px",
                    padding: "11px", border: "1px dashed var(--jood-line)",
                    borderRadius: "var(--radius-lg)", background: "none",
                    cursor: "pointer", fontFamily: "var(--font-label)",
                    fontSize: "9px", letterSpacing: "0.14em",
                    textTransform: "uppercase", color: "var(--jood-ink-ghost)",
                    transition: "border-color 150ms, color 150ms",
                  }}
                >
                  View all {upcoming.length} bookings
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ════════════ LIST VIEW ════════════════════════════════════════ */}
      {view === "list" && (
        <>
          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <span style={{
              position: "absolute", left: "14px", top: "50%",
              transform: "translateY(-50%)", color: "var(--jood-ink-ghost)",
              fontSize: "1rem", pointerEvents: "none",
            }}>
              ⌕
            </span>
            <input
              type="text"
              placeholder="Guest, property, status…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "12px 40px 12px 40px",
                border: "1px solid var(--jood-line)",
                borderRadius: "var(--radius-pill)",
                backgroundColor: "var(--jood-surface)",
                color: "var(--jood-ink)", fontSize: "1rem",
                fontFamily: "inherit", outline: "none",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                style={{
                  position: "absolute", right: "14px", top: "50%",
                  transform: "translateY(-50%)", background: "none",
                  border: "none", cursor: "pointer",
                  color: "var(--jood-ink-ghost)", fontSize: "1.1rem", padding: 0,
                }}
              >
                ×
              </button>
            )}
          </div>

          {searchResults.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "56px 24px",
              backgroundColor: "var(--jood-surface)",
              border: "1px solid var(--jood-line)",
              borderRadius: "var(--radius-lg)",
            }}>
              <p style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--jood-ink)" }}>
                {query ? `No results for "${query}"` : "No bookings yet"}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {searchResults.map((b) => {
                const isActive = b.check_in.slice(0, 10) <= todayISO && b.check_out.slice(0, 10) >= todayISO;
                const nights   = nightCount(b.check_in, b.check_out);
                const rl       = relLabel(b.check_in, b.check_out, todayISO);

                return (
                  <Link
                    key={b.id}
                    href={`/admin/bookings/${b.id}`}
                    style={{
                      display: "flex", alignItems: "center", gap: "14px",
                      padding: "14px 16px", textDecoration: "none", color: "inherit",
                      backgroundColor: isActive ? "var(--jood-surface-raised)" : "var(--jood-surface)",
                      border: "1px solid var(--jood-line)",
                      borderLeft: isActive ? "3px solid var(--jood-garnet)" : "1px solid var(--jood-line)",
                      borderRadius: "var(--radius-lg)",
                      opacity: b.status === "cancelled" ? 0.45 : 1,
                      transition: "filter 120ms",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.97)")}
                    onMouseLeave={(e) => (e.currentTarget.style.filter = "")}
                  >
                    <div style={{
                      width: "10px", height: "10px", borderRadius: "50%",
                      backgroundColor: STATUS_DOT[b.status] ?? "var(--jood-ink)",
                      flexShrink: 0,
                    }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 500, fontSize: "0.9375rem", color: "var(--jood-ink)" }}>
                        {b.guest_first_name} {b.guest_last_name}
                      </p>
                      <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginTop: "2px" }}>
                        {propName(b)}
                      </p>
                      <p style={{
                        fontFamily: "var(--font-mono)", fontSize: "10px",
                        color: "var(--jood-ink-ghost)", marginTop: "3px",
                      }}>
                        {fmtShort(b.check_in)} → {fmtShort(b.check_out)} · {nights}n · {b.source}
                      </p>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                      <span style={{
                        fontFamily: "var(--font-label)", fontSize: "8px",
                        letterSpacing: "0.12em", textTransform: "uppercase",
                        color: rl.urgent ? "var(--jood-garnet)" : "var(--jood-ink-ghost)",
                        border: `1px solid ${rl.urgent ? "var(--jood-garnet)" : "var(--jood-line)"}`,
                        borderRadius: "var(--radius-pill)", padding: "3px 8px",
                      }}>
                        {rl.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────
const styles = {
  eyebrow: {
    fontFamily: "var(--font-label)", fontSize: "8.5px",
    letterSpacing: "0.2em", textTransform: "uppercase",
    color: "var(--jood-ink-ghost)",
  } satisfies CSSProperties,

  displayTitle: {
    fontFamily: "var(--font-display)", fontSize: "1.875rem",
    fontStyle: "italic", fontWeight: 400, color: "var(--jood-ink)",
    lineHeight: 1, marginTop: "4px",
  } satisfies CSSProperties,

  fab: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "42px", height: "42px", borderRadius: "50%",
    backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)",
    textDecoration: "none", fontSize: "1.375rem", lineHeight: 1,
    flexShrink: 0, fontWeight: 300,
  } satisfies CSSProperties,

  segmentedControl: {
    display: "flex", gap: "3px", padding: "3px",
    backgroundColor: "var(--jood-surface-raised)",
    borderRadius: "var(--radius-pill)", marginBottom: "24px",
  } satisfies CSSProperties,

  segmentBtn: {
    flex: 1, padding: "9px 12px",
    border: "none", borderRadius: "var(--radius-pill)",
    cursor: "pointer", fontFamily: "var(--font-label)",
    fontSize: "9px", letterSpacing: "0.14em",
    textTransform: "uppercase", transition: "all 160ms",
  } satisfies CSSProperties,

  navBtn: {
    width: "38px", height: "38px", borderRadius: "50%",
    border: "1px solid var(--jood-line)", background: "transparent",
    cursor: "pointer", fontSize: "1.15rem", color: "var(--jood-ink-muted)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  } satisfies CSSProperties,

  monthLabel: {
    fontFamily: "var(--font-display)", fontSize: "1.35rem",
    fontStyle: "italic", fontWeight: 400, color: "var(--jood-ink)", lineHeight: 1,
  } satisfies CSSProperties,

  upcomingCard: (urgent: boolean): CSSProperties => ({
    display: "flex", alignItems: "center", gap: "12px",
    padding: "12px 14px", textDecoration: "none", color: "inherit",
    backgroundColor: "var(--jood-surface)",
    border: "1px solid var(--jood-line)",
    borderLeft: urgent ? "3px solid var(--jood-garnet)" : "1px solid var(--jood-line)",
    borderRadius: "var(--radius-lg)", transition: "filter 120ms",
  }),
};
