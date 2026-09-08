"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
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

// ── Status palette ────────────────────────────────────────────────────────────
const BAR: Record<string, { bg: string; text: string; border: string }> = {
  confirmed: { bg: "var(--jood-ink)",            text: "var(--jood-ground)",    border: "transparent" },
  paid:      { bg: "var(--jood-info-surface)",   text: "var(--jood-info)",      border: "var(--jood-info)" },
  pending:   { bg: "rgba(255,96,55,0.12)",       text: "var(--jood-accent)",    border: "var(--jood-accent)" },
  completed: { bg: "var(--jood-surface-raised)", text: "var(--jood-ink-muted)", border: "var(--jood-line)" },
  cancelled: { bg: "var(--jood-surface)",        text: "var(--jood-ink-ghost)", border: "var(--jood-line)" },
};
function barStyle(status: string) { return BAR[status] ?? BAR.confirmed; }

// ── Source colours (dots only — no new accent hues) ───────────────────────────
const SOURCE_COLOR: Record<string, string> = {
  airbnb:  "#FF5A5F",
  booking: "#003580",
  direct:  "var(--jood-garnet)",
  other:   "var(--jood-ink-ghost)",
};

// ── Date helpers ──────────────────────────────────────────────────────────────
function startOfMonth(year: number, month: number) { return new Date(year, month, 1); }
function daysInMonth(year: number, month: number)  { return new Date(year, month + 1, 0).getDate(); }
function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function nightCount(ci: string, co: string) {
  return Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000);
}

// ── Relative-time label for list view ─────────────────────────────────────────
function relativeLabel(checkIn: string, checkOut: string): { label: string; color: string } {
  const now   = new Date();
  const inMs  = new Date(checkIn).getTime();
  const outMs = new Date(checkOut).getTime();
  if (now.getTime() >= inMs && now.getTime() <= outMs)
    return { label: "Active",    color: "var(--jood-garnet)" };
  const diff = inMs - now.getTime();
  if (diff > 0) {
    const days = Math.ceil(diff / 86400000);
    return {
      label: days === 1 ? "Tomorrow" : `In ${days}d`,
      color: days <= 3 ? "var(--jood-accent)" : "var(--jood-ink-ghost)",
    };
  }
  const past = Math.ceil((now.getTime() - outMs) / 86400000);
  return { label: `${past}d ago`, color: "var(--jood-ink-ghost)" };
}

const MONTH_NAMES = ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"];
const DAY_ABBR = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function propName(b: Booking) {
  const p = Array.isArray(b.properties) ? b.properties[0] : b.properties;
  return p?.name ?? "";
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── Layout constants ──────────────────────────────────────────────────────────
const PROP_COL = 148;  // property label column width (px)
const DAY_W    = 36;   // day cell width (px)
const BAR_H    = 26;   // booking bar height (px)
const LANE_H   = 34;   // vertical space per lane (px)
const ROW_MIN  = 60;   // minimum row height (px)

export function BookingsCalendarClient({ initialBookings, properties }: Props) {
  const today    = new Date();
  const todayStr = toDateStr(today);

  const [view, setView]     = useState<"calendar" | "list">("calendar");
  const [anchor, setAnchor] = useState(() => startOfMonth(today.getFullYear(), today.getMonth()));
  const [query, setQuery]   = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll today into view on mount / view change
  useEffect(() => {
    if (view !== "calendar" || !scrollRef.current) return;
    const dom = scrollRef.current;
    if (today.getFullYear() === anchor.getFullYear() && today.getMonth() === anchor.getMonth()) {
      const offset = PROP_COL + (today.getDate() - 1) * DAY_W - dom.clientWidth / 2 + DAY_W / 2;
      dom.scrollLeft = Math.max(0, offset);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchor.toISOString()]);

  const days       = daysInMonth(anchor.getFullYear(), anchor.getMonth());
  const monthLabel = `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
  const monthStart = toDateStr(anchor);
  const monthEnd   = toDateStr(new Date(anchor.getFullYear(), anchor.getMonth(), days));
  const totalW     = PROP_COL + days * DAY_W;

  const todayCol = today.getFullYear() === anchor.getFullYear() &&
                   today.getMonth()    === anchor.getMonth()
    ? today.getDate() : null;

  // Group bookings by property for calendar view
  const byPropEntries: [string, Booking[]][] = [];
  {
    const map = new Map<string, Booking[]>();
    for (const p of properties) map.set(p.id, []);
    for (const b of initialBookings) {
      if (b.check_in > monthEnd || b.check_out < monthStart) continue;
      if (!map.has(b.property_id)) map.set(b.property_id, []);
      map.get(b.property_id)!.push(b);
    }
    map.forEach((v, k) => byPropEntries.push([k, v]));
  }
  const byProp = new Map(byPropEntries);

  // Filtered bookings for list view
  const q = query.toLowerCase().trim();
  const filtered = q
    ? initialBookings.filter((b) =>
        `${b.guest_first_name} ${b.guest_last_name}`.toLowerCase().includes(q) ||
        propName(b).toLowerCase().includes(q) ||
        b.status.toLowerCase().includes(q)
      )
    : initialBookings;

  return (
    <div>
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "24px", gap: "12px", flexWrap: "wrap",
      }}>
        <div>
          <p style={{
            fontFamily: "var(--font-label)", fontSize: "8.5px", letterSpacing: "0.2em",
            textTransform: "uppercase", color: "var(--jood-ink-faint)", marginBottom: "4px",
          }}>
            Admin · Reservations
          </p>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 400,
            fontStyle: "italic", color: "var(--jood-ink)", lineHeight: 1,
          }}>
            Bookings
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* View toggle */}
          <div style={{
            display: "flex", border: "1px solid var(--jood-line)",
            borderRadius: "var(--radius-pill)", overflow: "hidden",
          }}>
            {(["calendar", "list"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "7px 18px",
                background: view === v ? "var(--jood-ink)" : "transparent",
                color: view === v ? "var(--jood-ground)" : "var(--jood-ink-muted)",
                border: "none", cursor: "pointer", fontFamily: "var(--font-label)",
                fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase",
                transition: "background 180ms, color 180ms",
              }}>
                {v === "calendar" ? "Timeline" : "List"}
              </button>
            ))}
          </div>

          <Link href="/admin/bookings/new" style={{
            padding: "10px 22px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)",
            borderRadius: "var(--radius-pill)", textDecoration: "none",
            fontFamily: "var(--font-label)", fontSize: "9px",
            letterSpacing: "0.14em", textTransform: "uppercase", flexShrink: 0,
          }}>
            + New booking
          </Link>
        </div>
      </div>

      {/* ── Calendar / Timeline view ──────────────────────────────────────── */}
      {view === "calendar" && (
        <>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <button onClick={() => setAnchor((a) => addMonths(a, -1))} style={navBtn}>‹</button>
            <span style={{
              fontFamily: "var(--font-display)", fontSize: "1.15rem", fontStyle: "italic",
              fontWeight: 400, minWidth: "170px", textAlign: "center", color: "var(--jood-ink)",
            }}>
              {monthLabel}
            </span>
            <button onClick={() => setAnchor((a) => addMonths(a, 1))} style={navBtn}>›</button>
            {(anchor.getMonth() !== today.getMonth() || anchor.getFullYear() !== today.getFullYear()) && (
              <button onClick={() => setAnchor(startOfMonth(today.getFullYear(), today.getMonth()))} style={{
                padding: "6px 14px", border: "1px solid var(--jood-garnet)",
                borderRadius: "var(--radius-pill)", background: "transparent", cursor: "pointer",
                fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase",
                fontFamily: "var(--font-label)", color: "var(--jood-garnet)",
                transition: "background 150ms, color 150ms",
              }}>
                Today
              </button>
            )}
          </div>

          {/* Scrollable grid */}
          <div ref={scrollRef} style={{
            overflowX: "auto",
            border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)",
          }}>
            <div style={{ minWidth: `${totalW}px` }}>

              {/* ── Day header ─────────────────────────────────────────── */}
              <div style={{
                display: "flex", borderBottom: "1px solid var(--jood-line)",
                position: "sticky", top: 0, zIndex: 10,
                backgroundColor: "var(--jood-surface)",
              }}>
                {/* Property label header */}
                <div style={{
                  width: `${PROP_COL}px`, flexShrink: 0, padding: "10px 14px",
                  borderRight: "1px solid var(--jood-line)",
                  display: "flex", alignItems: "center",
                }}>
                  <span style={eyebrow}>Property</span>
                </div>

                {Array.from({ length: days }, (_, i) => {
                  const d        = new Date(anchor.getFullYear(), anchor.getMonth(), i + 1);
                  const dow      = d.getDay();
                  const isToday  = todayCol === i + 1;
                  const isWeekend = dow === 0 || dow === 6;
                  return (
                    <div key={i} style={{
                      width: `${DAY_W}px`, flexShrink: 0, textAlign: "center",
                      padding: "7px 0 6px",
                      backgroundColor: isToday
                        ? "var(--jood-garnet)"
                        : isWeekend ? "var(--jood-surface-raised)" : "transparent",
                      borderLeft: i > 0 ? "1px solid var(--jood-line)" : "none",
                    }}>
                      <div style={{
                        fontFamily: "var(--font-label)", fontSize: "7px", letterSpacing: "0.1em",
                        color: isToday ? "rgba(245,244,237,0.65)" : "var(--jood-ink-ghost)",
                        textTransform: "uppercase", marginBottom: "2px",
                      }}>
                        {DAY_ABBR[dow]}
                      </div>
                      <div style={{
                        fontFamily: "var(--font-mono)", fontSize: "11px", fontVariantNumeric: "tabular-nums",
                        color: isToday ? "var(--jood-ground)" : isWeekend ? "var(--jood-ink-muted)" : "var(--jood-ink)",
                        fontWeight: isToday ? 700 : 400,
                      }}>
                        {i + 1}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Property rows ───────────────────────────────────────── */}
              {properties.length === 0 ? (
                <div style={{ padding: "48px", textAlign: "center", color: "var(--jood-ink-ghost)", fontSize: "0.875rem" }}>
                  No properties yet
                </div>
              ) : properties.map((prop, pi) => {
                const bks   = byProp.get(prop.id) ?? [];
                const lanes = packLanes(bks);
                const rowH  = Math.max(ROW_MIN, lanes.length * LANE_H + 14);

                return (
                  <div key={prop.id} style={{
                    display: "flex",
                    borderTop: pi === 0 ? "none" : "1px solid var(--jood-line)",
                    minHeight: `${rowH}px`,
                    // Alternating rows: very subtle tint
                    backgroundColor: pi % 2 === 1 ? "var(--jood-surface-raised)" : "var(--jood-surface)",
                  }}>
                    {/* Property label — sticky on horizontal scroll */}
                    <div style={{
                      width: `${PROP_COL}px`, flexShrink: 0, padding: "12px 14px",
                      borderRight: "1px solid var(--jood-line)",
                      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                      position: "sticky", left: 0, zIndex: 5,
                      backgroundColor: pi % 2 === 1 ? "var(--jood-surface-raised)" : "var(--jood-surface)",
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: 0 }}>
                        <span style={{
                          fontFamily: "var(--font-body)", fontSize: "0.8125rem", fontWeight: 500,
                          color: "var(--jood-ink)", wordBreak: "break-word", lineHeight: 1.3,
                        }}>
                          {prop.name}
                        </span>
                        {bks.length > 0 && (
                          <span style={{
                            fontFamily: "var(--font-label)", fontSize: "8px", letterSpacing: "0.12em",
                            color: "var(--jood-ink-ghost)", textTransform: "uppercase",
                          }}>
                            {bks.length} this month
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bars area */}
                    <div style={{ flex: 1, position: "relative", minHeight: `${rowH}px` }}>
                      {/* Weekend column shading */}
                      {Array.from({ length: days }, (_, i) => {
                        const dow = new Date(anchor.getFullYear(), anchor.getMonth(), i + 1).getDay();
                        if (dow !== 0 && dow !== 6) return null;
                        return (
                          <div key={i} style={{
                            position: "absolute", top: 0, bottom: 0,
                            left: `${i * DAY_W}px`, width: `${DAY_W}px`,
                            backgroundColor: "rgba(0,0,0,0.025)", pointerEvents: "none",
                          }} />
                        );
                      })}

                      {/* Today column highlight — runs full row height */}
                      {todayCol !== null && (
                        <div style={{
                          position: "absolute", top: 0, bottom: 0,
                          left: `${(todayCol - 1) * DAY_W}px`, width: `${DAY_W}px`,
                          backgroundColor: "rgba(115,54,53,0.06)", pointerEvents: "none", zIndex: 1,
                        }} />
                      )}

                      {/* Today vertical rule — sharp, prominent */}
                      {todayCol !== null && (
                        <div style={{
                          position: "absolute", top: 0, bottom: 0,
                          left: `${(todayCol - 0.5) * DAY_W}px`,
                          width: "1.5px", backgroundColor: "var(--jood-garnet)",
                          opacity: 0.7, pointerEvents: "none", zIndex: 4,
                        }} />
                      )}

                      {/* Booking bars */}
                      {lanes.map((lane, li) =>
                        lane.map((b) => {
                          const clampedStart = b.check_in  < monthStart ? monthStart : b.check_in;
                          const clampedEnd   = b.check_out > monthEnd   ? monthEnd   : b.check_out;
                          const startDay = new Date(clampedStart).getDate();
                          const endDay   = new Date(clampedEnd).getDate();
                          const spanDays = b.check_out > monthEnd
                            ? endDay - startDay + 1
                            : Math.max(1, endDay - startDay);
                          const barW  = spanDays * DAY_W - 4;
                          const left  = (startDay - 1) * DAY_W + 2;
                          const top   = li * LANE_H + Math.round((LANE_H - BAR_H) / 2);
                          const { bg, text, border } = barStyle(b.status);
                          const isCancelled = b.status === "cancelled";
                          const nights      = nightCount(b.check_in, b.check_out);
                          const showNights  = barW > 60 && nights > 1;
                          const showSource  = barW > 88;

                          return (
                            <Link
                              key={b.id}
                              href={`/admin/bookings/${b.id}`}
                              title={`${b.guest_first_name} ${b.guest_last_name} · ${fmtShort(b.check_in)} → ${fmtShort(b.check_out)} · ${nights}n`}
                              style={{
                                position: "absolute", top: `${top}px`, left: `${left}px`,
                                width: `${barW}px`, height: `${BAR_H}px`,
                                backgroundColor: bg, border: `1px solid ${border}`,
                                borderRadius: "var(--radius-pill)",
                                display: "flex", alignItems: "center",
                                padding: `0 ${showSource ? 20 : 8}px 0 8px`,
                                textDecoration: "none", overflow: "hidden",
                                zIndex: 3,
                                opacity: isCancelled ? 0.4 : 1,
                                transition: "filter 150ms, opacity 150ms",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
                              onMouseLeave={(e) => (e.currentTarget.style.filter = "")}
                            >
                              <span style={{
                                fontFamily: "var(--font-body)", fontSize: "11px", color: text,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                textDecoration: isCancelled ? "line-through" : "none",
                                flex: 1, minWidth: 0,
                              }}>
                                {b.guest_first_name} {b.guest_last_name}
                              </span>
                              {showNights && (
                                <span style={{
                                  fontFamily: "var(--font-mono)", fontSize: "9px",
                                  color: text, opacity: 0.55, marginLeft: "4px", flexShrink: 0,
                                }}>
                                  {nights}n
                                </span>
                              )}
                              {showSource && (
                                <span style={{
                                  position: "absolute", right: "8px", top: "50%",
                                  transform: "translateY(-50%)",
                                  width: "5px", height: "5px", borderRadius: "50%",
                                  backgroundColor: SOURCE_COLOR[b.source] ?? SOURCE_COLOR.other,
                                  flexShrink: 0, opacity: 0.65,
                                }} />
                              )}
                            </Link>
                          );
                        })
                      )}

                      {bks.length === 0 && (
                        <div style={{
                          position: "absolute", inset: 0,
                          display: "flex", alignItems: "center",
                          paddingLeft: "16px",
                        }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--jood-line)", letterSpacing: "0.08em" }}>—</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* ── Legend ─────────────────────────────────────────────── */}
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 16px", borderTop: "1px solid var(--jood-line)",
                backgroundColor: "var(--jood-surface)", flexWrap: "wrap",
              }}>
                <span style={{ ...eyebrow, marginRight: "2px" }}>Status</span>
                {Object.entries(BAR).map(([status, { bg, text, border }]) => (
                  <span key={status} style={{
                    display: "inline-flex", alignItems: "center",
                    height: "18px", padding: "0 8px",
                    backgroundColor: bg,
                    border: `1px solid ${border === "transparent" ? "rgba(0,0,0,0.08)" : border}`,
                    borderRadius: "var(--radius-pill)",
                    fontFamily: "var(--font-label)", fontSize: "8px",
                    letterSpacing: "0.1em", textTransform: "uppercase", color: text,
                  }}>
                    {status}
                  </span>
                ))}
                {/* Source key — right-aligned */}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  <span style={{ ...eyebrow, marginRight: "2px" }}>Source</span>
                  {Object.entries(SOURCE_COLOR).map(([src, col]) => (
                    <span key={src} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{
                        width: "6px", height: "6px", borderRadius: "50%",
                        backgroundColor: col, display: "inline-block", opacity: 0.7,
                      }} />
                      <span style={{
                        fontFamily: "var(--font-label)", fontSize: "8px",
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        color: "var(--jood-ink-ghost)",
                      }}>
                        {src}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── List view ────────────────────────────────────────────────────── */}
      {view === "list" && (
        <>
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <span style={{
              position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
              color: "var(--jood-ink-ghost)", fontSize: "0.875rem", pointerEvents: "none",
            }}>⌕</span>
            <input
              type="text"
              placeholder="Search guest, property, status…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "11px 14px 11px 38px",
                border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)",
                backgroundColor: "var(--jood-surface)", color: "var(--jood-ink)",
                fontSize: "0.9375rem", fontFamily: "inherit", outline: "none",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                style={{
                  position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--jood-ink-ghost)", fontSize: "1rem", padding: 0,
                }}
              >×</button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "56px 24px",
              backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)",
              borderRadius: "var(--radius-lg)",
            }}>
              <p style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--jood-ink)", marginBottom: "4px" }}>
                {query ? `No results for "${query}"` : "No bookings yet"}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {filtered.map((b) => {
                const isActive = b.check_in <= todayStr && b.check_out >= todayStr;
                const nights   = nightCount(b.check_in, b.check_out);
                const { bg, border } = barStyle(b.status);
                const rel      = relativeLabel(b.check_in, b.check_out);
                return (
                  <Link key={b.id} href={`/admin/bookings/${b.id}`} style={{
                    display: "flex", alignItems: "center", gap: "14px", padding: "13px 16px",
                    backgroundColor: isActive ? "var(--jood-surface-raised)" : "var(--jood-surface)",
                    border: "1px solid var(--jood-line)",
                    borderLeft: isActive ? "3px solid var(--jood-garnet)" : "1px solid var(--jood-line)",
                    borderRadius: "var(--radius-lg)", textDecoration: "none", color: "inherit",
                    opacity: b.status === "cancelled" ? 0.45 : 1,
                    transition: "filter 120ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.97)")}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = "")}
                  >
                    {/* Status dot */}
                    <div style={{
                      width: "10px", height: "10px", borderRadius: "50%",
                      backgroundColor: bg, flexShrink: 0,
                      border: `1.5px solid ${border === "transparent" ? "rgba(0,0,0,0.12)" : border}`,
                    }} />

                    {/* Guest + property */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 500, fontSize: "0.9375rem", color: "var(--jood-ink)" }}>
                        {b.guest_first_name} {b.guest_last_name}
                      </p>
                      <p style={{ fontSize: "0.8rem", color: "var(--jood-ink-muted)", marginTop: "1px" }}>
                        {propName(b)}
                      </p>
                    </div>

                    {/* Dates + meta */}
                    <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px" }}>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--jood-ink-muted)", fontVariantNumeric: "tabular-nums" }}>
                        {fmtShort(b.check_in)} → {fmtShort(b.check_out)}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--jood-ink-ghost)" }}>
                          {nights}n · {b.source}
                        </span>
                        {/* Relative time chip */}
                        <span style={{
                          fontFamily: "var(--font-label)", fontSize: "8px", letterSpacing: "0.1em",
                          textTransform: "uppercase", color: rel.color,
                          border: `1px solid ${rel.color}`, borderRadius: "var(--radius-pill)",
                          padding: "1px 6px", lineHeight: "1.6",
                        }}>
                          {rel.label}
                        </span>
                      </div>
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

// ── Lane packing ─────────────────────────────────────────────────────────────
// Greedy interval packing — assigns overlapping bookings to separate vertical lanes
function packLanes(bookings: Booking[]): Booking[][] {
  const sorted = [...bookings].sort((a, b) => a.check_in.localeCompare(b.check_in));
  const lanes: Booking[][] = [];
  for (const b of sorted) {
    let placed = false;
    for (const lane of lanes) {
      const last = lane[lane.length - 1];
      if (last.check_out <= b.check_in) {
        lane.push(b);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push([b]);
  }
  return lanes;
}

// ── Shared micro-styles ───────────────────────────────────────────────────────
const navBtn: CSSProperties = {
  width: "34px", height: "34px", border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-md)", background: "transparent", cursor: "pointer",
  fontSize: "1.2rem", color: "var(--jood-ink-muted)", display: "flex",
  alignItems: "center", justifyContent: "center",
  transition: "border-color 150ms, color 150ms",
};

const eyebrow: CSSProperties = {
  fontFamily: "var(--font-label)", fontSize: "8px", letterSpacing: "0.18em",
  textTransform: "uppercase", color: "var(--jood-ink-ghost)",
};
