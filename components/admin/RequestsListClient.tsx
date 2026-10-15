"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Empty, RecordCard, SectionHead, State, type Tone } from "@/components/app/ui";

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

const STATUS_TONE: Record<string, Tone> = {
  pending: "warn", received: "warn", approved: "info", in_progress: "info",
  paid: "ok", fulfilled: "ok", resolved: "ok", rejected: "danger",
};

const CAT_LABELS: Record<string, string> = {
  maintenance: "Maintenance", housekeeping: "Housekeeping",
  supplies: "Supplies", service: "Service booking", other: "Other",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "Africa/Cairo", day: "numeric", month: "short" });
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
          backgroundColor: "var(--jood-accent)",
          color: "white",
          fontSize: "0.68rem", fontFamily: "var(--font-label)",
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

  const chip = (status: string) => <State tone={STATUS_TONE[status] ?? "neutral"}>{status.replace("_", " ")}</State>;

  return (
    <div>
      <h1 style={{ margin: "0 0 16px" }}>Requests</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <TabBtn t="guest" label="Guest requests" pending={pendingGuest} activeTab={tab} setTab={setTab} />
        <TabBtn t="service" label="Service bookings" pending={pendingServices} activeTab={tab} setTab={setTab} />
      </div>

      {/* Search: a pill with a round ink button, filters as you type */}
      <div className="app-search">
        <Search size={18} strokeWidth={1.8} />
        <input type="text" placeholder="Search a guest, a house or a status" aria-label="Search requests" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="button" aria-label={query ? "Clear" : "Search"} onClick={() => setQuery("")}>{query ? <X size={18} strokeWidth={1.8} /> : <Search size={18} strokeWidth={1.8} />}</button>
      </div>

      {tab === "guest" && (
        <>
          <SectionHead title="Guest requests" count={filteredGuest.length} />
          {!filteredGuest.length && (
            <Empty text={query ? `No results for "${query}". Try different words.` : "No guest requests yet. They will appear here."} />
          )}
          {filteredGuest.map((r) => {
            const booking  = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
            const property = booking ? (Array.isArray(booking.properties) ? booking.properties[0] : booking.properties) : null;
            const urgent = r.urgency === "urgent";
            return (
              <RecordCard
                key={r.id}
                href={`/admin/requests/guest/${r.id}`}
                kicker={`${CAT_LABELS[r.category] ?? r.category} · ${fmt(r.created_at)}`}
                state={<span style={{ display: "inline-flex", gap: "6px" }}>{urgent && <State tone="danger">Urgent</State>}{chip(r.status)}</span>}
                cols={[
                  { label: "Said", value: r.body.length > 90 ? r.body.slice(0, 90) + "…" : r.body },
                  { label: "Guest", value: `${booking?.guest_first_name ?? ""} ${booking?.guest_last_name ?? ""} · ${(property as { name: string } | null)?.name ?? ""}` },
                ]}
              />
            );
          })}
        </>
      )}

      {tab === "service" && (
        <>
          <SectionHead title="Service bookings" count={filteredService.length} />
          {!filteredService.length && (
            <Empty text={query ? `No results for "${query}". Try different words.` : "No service bookings yet. They will appear here."} />
          )}
          {filteredService.map((r) => {
            const booking  = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
            const property = booking ? (Array.isArray(booking.properties) ? booking.properties[0] : booking.properties) : null;
            const totalPrice = (r.services?.price_egp ?? 0) * r.quantity;
            return (
              <RecordCard
                key={r.id}
                href={`/admin/requests/service/${r.id}`}
                kicker={`${fmt(r.created_at)}${totalPrice > 0 ? ` · ${totalPrice.toLocaleString()} EGP` : " · Free"}`}
                state={chip(r.status)}
                cols={[
                  { label: "Service", value: `${r.quantity > 1 ? `${r.quantity}× ` : ""}${r.services?.name_en ?? "Service"}` },
                  { label: "Guest", value: `${booking?.guest_first_name ?? ""} ${booking?.guest_last_name ?? ""} · ${(property as { name: string } | null)?.name ?? ""}` },
                ]}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
