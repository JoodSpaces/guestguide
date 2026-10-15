"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { dayContents, KIND_LABEL, monthBounds, shiftMonth, type CalEvent, type CalKind, type CalStay } from "@/lib/calendar-events";
import { Empty, RecordCard, State } from "@/components/app/ui";

interface Props {
  month: string;       // YYYY-MM
  today: string;       // YYYY-MM-DD in Cairo
  events: CalEvent[];
  stays: CalStay[];
  properties: { id: string; name: string }[];
  failed: string[];    // what could not be read, named on the page
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const KIND_ORDER: CalKind[] = ["checkin", "checkout", "clean", "fix", "service", "request"];
const KIND_SHORT: Record<CalKind, string> = { checkin: "IN", checkout: "OUT", clean: "CLEAN", fix: "FIX", service: "SVC", request: "ASK" };

const dow = (date: string) => (new Date(date + "T00:00:00Z").getUTCDay() + 6) % 7;   // Monday = 0
const monthName = (m: string) => new Date(m + "-01T00:00:00Z").toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
const weekdayShort = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
const weekdayLong = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });

export function CalendarClient({ month, today, events, stays, properties, failed }: Props) {
  const [house, setHouse] = useState<string>("all");
  const [open, setOpen] = useState<string | null>(null);
  const { first, days } = monthBounds(month);
  const year = month.slice(0, 4);

  const evs = useMemo(() => (house === "all" ? events : events.filter((e) => e.propertyId === house)), [events, house]);
  const sts = useMemo(() => (house === "all" ? stays : stays.filter((s) => s.propertyId === house)), [stays, house]);
  const dates = useMemo(() => Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`), [month, days]);
  const lead = dow(first);
  const headDate = open ?? (today.startsWith(month) ? today : first);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  const monthTotals = useMemo(() => {
    const t: Record<CalKind, number> = { checkin: 0, checkout: 0, clean: 0, fix: 0, service: 0, request: 0 };
    for (const e of evs) t[e.kind]++;
    return t;
  }, [evs]);

  return (
    <div className="cal">
      {failed.length > 0 && (
        <p className="cal-fail" role="alert">Could not read: {failed.join(", ")}. What is shown may be incomplete.</p>
      )}

      {/* the date, large: the day number, the month, the weekday */}
      <header className="cal-head">
        <div className="cal-num" aria-hidden>{Number(headDate.slice(8))}</div>
        <div className="cal-meta">
          <b className="cal-month">{monthName(month)}</b>
          <span className="cal-year">{year}</span>
        </div>
        <div className="cal-wd">{weekdayShort(headDate)}</div>
      </header>

      <div className="cal-bar">
        <div className="cal-nav">
          <Link href={`/admin/calendar?m=${shiftMonth(month, -1)}`} aria-label="Previous month" className="app-roundbtn">←</Link>
          <Link href={`/admin/calendar?m=${shiftMonth(month, 1)}`} aria-label="Next month" className="app-roundbtn">→</Link>
          {!today.startsWith(month) && <Link href="/admin/calendar" className="cal-today">Today</Link>}
        </div>
        <div className="cal-houses" role="tablist" aria-label="House">
          <button type="button" role="tab" aria-selected={house === "all"} onClick={() => setHouse("all")}>All houses</button>
          {properties.map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={house === p.id} onClick={() => setHouse(p.id)}>{p.name}</button>
          ))}
        </div>
      </div>

      {/* the month as dots */}
      <div className="cal-grid" role="grid" aria-label={`${monthName(month)} ${year}`}>
        {WEEKDAYS.map((w, i) => (<span key={i} className="cal-dow" role="columnheader">{w}</span>))}
        {Array.from({ length: lead }).map((_, i) => (<span key={"b" + i} aria-hidden />))}
        {dates.map((d) => {
          const c = dayContents(d, evs, sts);
          const isToday = d === today;
          const past = d < today;
          const cls = ["cal-dot", isToday ? "today" : c.busy > 0 ? "busy" : c.inHouse.length > 0 ? "house" : past ? "past" : "future", open === d ? "sel" : ""].join(" ");
          return (
            <button key={d} type="button" role="gridcell" className={cls} onClick={() => setOpen(d)}
              aria-label={`${weekdayLong(d)} ${Number(d.slice(8))} ${monthName(month)}: ${c.busy} things scheduled, ${c.inHouse.length} guests in house${c.urgent ? ", something urgent" : ""}`}>
              <span>{Number(d.slice(8))}</span>
              {c.urgent && <i className="cal-urgent" aria-hidden />}
            </button>
          );
        })}
      </div>

      <ul className="cal-legend" aria-label="Legend">
        <li><i className="cal-dot busy" />Something on</li>
        <li><i className="cal-dot house" />Guests in house</li>
        <li><i className="cal-dot today" />Today</li>
        <li><i className="cal-dot future" />Quiet</li>
      </ul>

      {/* the month in numbers */}
      <div className="cal-totals">
        {KIND_ORDER.map((k) => (
          <div key={k}><b>{String(monthTotals[k]).padStart(2, "0")}</b><small>{KIND_SHORT[k]}</small></div>
        ))}
      </div>

      {/* the day sheet */}
      {open && <DaySheet date={open} month={month} events={evs} stays={sts} onClose={() => setOpen(null)} />}
    </div>
  );
}

function DaySheet({ date, month, events, stays, onClose }: { date: string; month: string; events: CalEvent[]; stays: CalStay[]; onClose: () => void }) {
  const c = dayContents(date, events, stays);
  const counts = KIND_ORDER.map((k) => ({ k, n: c.events.filter((e) => e.kind === k).length }));
  return (
    <div className="cal-sheet-wrap" role="dialog" aria-modal="true" aria-label={`${weekdayLong(date)} ${Number(date.slice(8))} ${monthName(month)}`}>
      <button type="button" className="cal-scrim" onClick={onClose} aria-label="Close day" />
      <section className="cal-sheet">
        <div className="cal-grab" aria-hidden />
        <div className="cal-sheet-head">
          <div>
            <p className="cal-sheet-kicker">{weekdayLong(date).toUpperCase()}</p>
            <h2 className="cal-sheet-title"><span>{Number(date.slice(8))}</span> {monthName(month)} {month.slice(0, 4)}</h2>
          </div>
          <button type="button" className="app-roundbtn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="cal-cells">
          {counts.map(({ k, n }) => (
            <div key={k} className={n > 0 ? "on" : ""}><b>{String(n).padStart(2, "0")}</b><small>{KIND_SHORT[k]}</small></div>
          ))}
        </div>

        {c.quiet && <Empty text="Nothing is scheduled and nobody is staying on this day." />}

        {KIND_ORDER.map((k) => {
          const list = c.events.filter((e) => e.kind === k);
          if (list.length === 0) return null;
          return (
            <div key={k}>
              <p className="cal-group">{KIND_LABEL[k]} <span>{list.length}</span></p>
              {list.map((e) => (
                <RecordCard key={e.id} href={e.href} kicker={e.sub || KIND_LABEL[k]} state={<State tone={e.tone}>{e.state}</State>}
                  cols={[{ label: KIND_LABEL[k], value: e.title }]} />
              ))}
            </div>
          );
        })}

        {c.inHouse.length > 0 && (
          <div>
            <p className="cal-group">In house <span>{c.inHouse.length}</span></p>
            {c.inHouse.map((s) => (
              <RecordCard key={s.id} href={s.href} kicker={s.propertyName} state={<State tone="neutral">Staying</State>}
                cols={[{ label: "Guest", value: s.guest }, { label: "Until", value: s.to.slice(8) + "/" + s.to.slice(5, 7) }]} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
