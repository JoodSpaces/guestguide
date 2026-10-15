"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, Plus } from "lucide-react";
import { Empty, RecordCard, SectionHead, State, StepLine, type Tone } from "@/components/app/ui";

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

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "Africa/Cairo", day: "numeric", month: "short" });
}

export function BookingsListClient({ initialBookings, initialQuery = "" }: { initialBookings: Booking[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
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

  const tone = (st: string): Tone => (st === "confirmed" ? "warn" : st === "cancelled" ? "danger" : st === "completed" ? "ok" : "neutral");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", gap: "16px" }}>
        <h1 style={{ margin: 0 }}>Bookings</h1>
        <Link href="/admin/bookings/new" className="btn btn-primary btn-sm"><Plus size={14} strokeWidth={2} /> New booking</Link>
      </div>

      {/* Search: a pill with a round ink button, filters as the list narrows */}
      <div className="app-search" style={{ marginBottom: "6px" }}>
        <Search size={18} strokeWidth={1.8} />
        <input type="text" placeholder="Search a guest, a house or a status" aria-label="Search bookings" value={query} onChange={(e) => setQuery(e.target.value)} />
        {query ? (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear"><X size={18} strokeWidth={1.8} /></button>
        ) : (
          <button type="button" aria-label="Search" tabIndex={-1}><Search size={18} strokeWidth={1.8} /></button>
        )}
      </div>

      <SectionHead title={query ? "Results" : "All bookings"} count={filtered.length} />

      {filtered.length === 0 && (
        <Empty
          text={query ? `No results for "${query}". Try a different name or house.` : "No bookings yet."}
          href={query ? undefined : "/admin/bookings/new"}
          hrefLabel="Add the first booking"
        />
      )}

      {filtered.map((b) => {
        const prop = Array.isArray(b.properties) ? b.properties[0] : b.properties;
        const inDay = b.check_in.slice(0, 10), outDay = b.check_out.slice(0, 10);
        const at = b.status === "completed" || today > outDay ? 2 : today >= inDay ? 1 : 0;
        const nights = Math.max(1, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000));
        return (
          <div key={b.id} style={{ opacity: b.status === "cancelled" ? 0.55 : 1 }}>
            <RecordCard
              href={`/admin/bookings/${b.id}`}
              kicker={`${b.source} · ${nights} night${nights === 1 ? "" : "s"}`}
              state={<State tone={tone(b.status)}>{b.status}</State>}
              cols={[{ label: "Guest", value: `${b.guest_first_name} ${b.guest_last_name}` }, { label: "House", value: prop?.name ?? "" }]}
            >
              {b.status !== "cancelled" && (
                <StepLine at={at} steps={[{ label: "Booked" }, { label: "Checked in", sub: fmtShort(b.check_in) }, { label: "Checked out", sub: fmtShort(b.check_out) }]} />
              )}
            </RecordCard>
          </div>
        );
      })}
    </div>
  );
}
