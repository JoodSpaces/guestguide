import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { ROLE_HOME } from "@/lib/admin-auth";
import { Package, RefreshCcw, Wrench, AlertTriangle, Check, MessageCircle, CalendarDays, type LucideIcon } from "lucide-react";
import { cairoDay, cairoHour } from "@/lib/cairo-time";
import { sortAlerts } from "@/lib/inventory";
import { DismissAlertButton } from "@/components/admin/DismissAlertButton";
import { Empty, Hero, RecordCard, SearchPill, SectionHead, State, StepLine } from "@/components/app/ui";

export default async function AdminTodayPage() {
  const h = await headers();
  const role = h.get("x-admin-role");
  if (!role) redirect("/admin/login");
  if (role !== "admin") redirect(ROLE_HOME[role] ?? "/admin/login");

  const supabase = createServiceClient();
  const now = new Date().toISOString();
  // "Today" is the Cairo day (the server runs in UTC, which is a day behind for the first hours after midnight).
  const { startIso: todayStart, endIso: todayEnd } = cairoDay();

  const [
    { data: arrivals },
    { data: departures },
    { data: openRequestItems, error: openRequestsError },
    { data: properties },
    { data: activeTurnovers },
    { data: openTickets },
    { data: pendingServiceReqs },
    { data: rawInvAlerts },
    { count: openRequestsCount },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, guest_first_name, guest_last_name, properties(name)")
      .gte("check_in", todayStart)
      .lte("check_in", todayEnd)
      .eq("status", "confirmed")
      .returns<{ id: string; guest_first_name: string; guest_last_name: string; properties: { name: string } }[]>(),
    supabase
      .from("bookings")
      .select("id, guest_first_name, guest_last_name, properties(name)")
      .gte("check_out", todayStart)
      .lte("check_out", todayEnd)
      .eq("status", "confirmed")
      .returns<{ id: string; guest_first_name: string; guest_last_name: string; properties: { name: string } }[]>(),
    supabase
      .from("guest_requests")
      .select("id, category, urgency, body, created_at, bookings(guest_first_name, properties(name))")
      .in("status", ["received", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<{ id: string; category: string; urgency: string; body: string; created_at: string; bookings: { guest_first_name: string; properties: { name: string } } }[]>(),
    supabase.from("properties").select("id, name").is("archived_at", null),
    supabase.from("turnover_tasks").select("property_id, status").in("status", ["pending", "in_progress"]),
    supabase
      .from("maintenance_tickets")
      .select("id, title, priority, status, property_id, properties(name)")
      .neq("status", "resolved")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<{ id: string; title: string; priority: string; status: string; property_id: string; properties: { name: string } }[]>(),
    supabase
      .from("service_requests")
      .select("id, quantity, created_at, services(name_en), bookings(guest_first_name, guest_last_name, property_id, properties(name))")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<{ id: string; quantity: number; created_at: string; services: { name_en: string } | null; bookings: { guest_first_name: string; guest_last_name: string; property_id: string; properties: { name: string } } | null }[]>(),
    // Graceful: returns empty if migration 006 hasn't been run
    supabase
      .from("inventory_alerts")
      .select("id, alert_type, severity, message, property_id, inventory_items(name, category)")
      .is("resolved_at", null)
      .limit(200),
    // Reliable count — no joins, so it can't fail due to FK resolution issues
    supabase
      .from("guest_requests")
      .select("*", { count: "exact", head: true })
      .in("status", ["received", "in_progress"]),
  ]);

  if (openRequestsError) console.error("[admin/page] open_requests join error:", openRequestsError.message);
  const openRequests = openRequestItems ?? [];
  // Prefer the dedicated count (join-free); fall back to array length if count query failed
  const openCount = openRequestsCount ?? openRequests.length;

  // Most urgent first. (Ordering the words alphabetically in SQL put "critical" LAST, so the top five shown below
  // could miss every critical alert.)
  const invAlerts = sortAlerts(rawInvAlerts ?? []);

  // ── Daily brief narrative ─────────────────────────────────────────────────
  const today = new Date();
  const briefParts: string[] = [];
  const arrCount = arrivals?.length ?? 0;
  const depCount = departures?.length ?? 0;
  const reqCount = openCount;
  const urgentCount = (openRequests ?? []).filter((r) => r.urgency === "urgent").length;
  const ticketCount = (openTickets ?? []).length;
  const criticalAlerts = (invAlerts ?? []).filter((a) => a.severity === "critical").length;

  if (arrCount > 0)
    briefParts.push(`${arrCount} check-in${arrCount > 1 ? "s" : ""} today`);
  if (depCount > 0)
    briefParts.push(`${depCount} check-out${depCount > 1 ? "s" : ""}`);
  if (reqCount > 0)
    briefParts.push(`${reqCount} open request${reqCount > 1 ? "s" : ""}${urgentCount > 0 ? ` (${urgentCount} urgent)` : ""}`);
  if (ticketCount > 0)
    briefParts.push(`${ticketCount} maintenance ticket${ticketCount > 1 ? "s" : ""}`);
  if (criticalAlerts > 0)
    briefParts.push(`${criticalAlerts} critical inventory alert${criticalAlerts > 1 ? "s" : ""}`);

  const briefSentence = briefParts.length === 0
    ? "All clear — no open items today."
    : briefParts.join(" · ") + ".";

  const needsYou = reqCount + ticketCount + (pendingServiceReqs?.length ?? 0) + criticalAlerts;
  const greetHour = cairoHour();
  const greetWord = greetHour < 12 ? "Good morning" : greetHour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      {/* ── The hero: what needs you today ──────────────────────────────── */}
      <Hero
        label={`${greetWord}${h.get("x-admin-name") ? ", " + h.get("x-admin-name") : ""} · ${today.toLocaleDateString("en-GB", { timeZone: "Africa/Cairo", weekday: "short", day: "numeric", month: "short" })}`}
        value={needsYou === 0 ? "All clear" : `${needsYou} to look at`}
        note={briefSentence}
        corner={{ href: "/admin/bookings/new", label: "New booking" }}
        actions={[
          { href: "/admin/requests", label: "Requests", icon: <MessageCircle size={18} strokeWidth={1.8} /> },
          { href: "/admin/calendar", label: "Calendar", icon: <CalendarDays size={18} strokeWidth={1.8} /> },
        ]}
      />
      <div style={{ marginBottom: "26px" }}><SearchPill action="/admin/bookings" placeholder="Search a guest or a house" /></div>

      {/* Property status rings */}
      {(properties?.length ?? 0) > 0 && (() => {
        const urgentPerProp = new Set((openTickets ?? []).filter((t) => t.priority === "urgent").map((t) => t.property_id));
        const pendingPerProp = new Set(
          (pendingServiceReqs ?? []).map((r) => {
            const b = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
            return (b as { property_id: string } | null)?.property_id;
          }).filter(Boolean)
        );
        const criticalInvPerProp = new Set(
          (invAlerts ?? []).filter((a) => a.severity === "critical").map((a) => a.property_id)
        );
        const openTicketPerProp = new Set((openTickets ?? []).filter((t) => t.priority !== "urgent").map((t) => t.property_id));

        function status(pid: string): "clear" | "amber" | "red" {
          if (urgentPerProp.has(pid) || criticalInvPerProp.has(pid)) return "red";
          if (pendingPerProp.has(pid) || openTicketPerProp.has(pid)) return "amber";
          return "clear";
        }

        function tooltip(pid: string): string {
          const parts: string[] = [];
          const urgentTickets = (openTickets ?? []).filter((t) => t.property_id === pid && t.priority === "urgent");
          if (urgentTickets.length > 0)
            parts.push(`Urgent: ${urgentTickets[0].title}${urgentTickets.length > 1 ? ` +${urgentTickets.length - 1} more` : ""}`);
          const critAlerts = (invAlerts ?? []).filter((a) => a.property_id === pid && a.severity === "critical");
          if (critAlerts.length > 0)
            parts.push(`Critical stock: ${critAlerts[0].message ?? "inventory alert"}`);
          const pending = (pendingServiceReqs ?? []).filter((r) => {
            const b = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
            return (b as { property_id: string } | null)?.property_id === pid;
          });
          if (pending.length > 0) {
            const svc = Array.isArray(pending[0].services) ? pending[0].services[0] : pending[0].services;
            parts.push(`${pending.length} pending service${pending.length > 1 ? "s" : ""}${svc ? ` (${svc.name_en})` : ""}`);
          }
          const normalTickets = (openTickets ?? []).filter((t) => t.property_id === pid && t.priority !== "urgent");
          if (normalTickets.length > 0 && urgentTickets.length === 0)
            parts.push(`${normalTickets.length} open ticket${normalTickets.length > 1 ? "s" : ""}`);
          return parts.length > 0 ? parts.join(" · ") : "All clear";
        }

        const STATUS_LABEL = { clear: "All clear", amber: "Needs attention", red: "Urgent" };

        function linkFor(pid: string, s: "clear" | "amber" | "red"): string {
          if (s === "red") {
            const urgentTicket = (openTickets ?? []).find((t) => t.property_id === pid && t.priority === "urgent");
            if (urgentTicket) return `/admin/ops/maintenance/${urgentTicket.id}`;
            if ((invAlerts ?? []).some((a) => a.property_id === pid && a.severity === "critical")) return `/admin/ops/inventory/${pid}`;
          }
          if (s === "amber") {
            const ticket = (openTickets ?? []).find((t) => t.property_id === pid);
            if (ticket) return `/admin/ops/maintenance/${ticket.id}`;
          }
          return `/admin/ops/inventory/${pid}`;
        }

        const TONE = { clear: "ok", amber: "warn", red: "danger" } as const;
        return (
          <div style={{ marginBottom: "8px" }}>
            <SectionHead title="Houses" count={properties!.length} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))", gap: "10px" }}>
              {properties!.map((p) => {
                const st = status(p.id);
                return (
                  <Link key={p.id} href={linkFor(p.id, st)} title={tooltip(p.id)} className="app-rc" style={{ marginBottom: 0, padding: "14px" }}>
                    <b style={{ display: "block", fontSize: "0.92rem", fontWeight: 650, marginBottom: "10px", overflowWrap: "anywhere" }}>{p.name}</b>
                    <State tone={TONE[st]}>{STATUS_LABEL[st]}</State>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Inventory health — shown only when there are open alerts */}
      {(invAlerts ?? []).length > 0 && (() => {
        const critical = (invAlerts ?? []).filter((a) => a.severity === "critical");
        const total    = (invAlerts ?? []).length;
        const ALERT_ICON: Record<string, LucideIcon> = { low_stock: Package, recurring_damage: RefreshCcw, out_of_service: Wrench };
        const SEVERITY_COLOR: Record<string, string> = { critical: "var(--jood-danger)", medium: "var(--jood-accent)", low: "var(--jood-aqua)" };
        return (
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <p style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)" }}>
                  Inventory
                </p>
                <span style={{
                  backgroundColor: critical.length > 0 ? "rgba(248,113,113,0.12)" : "rgba(245,158,11,0.12)",
                  color: critical.length > 0 ? "var(--jood-danger)" : "var(--jood-accent)",
                  borderRadius: "20px",
                  padding: "2px 8px",
                  fontSize: "0.7rem",
                  fontFamily: "var(--font-label)",
                  letterSpacing: "0.06em",
                }}>
                  {total} open alert{total !== 1 ? "s" : ""}
                  {critical.length > 0 ? ` · ${critical.length} critical` : ""}
                </span>
              </div>
              <Link href="/admin/ops" style={{ fontSize: "0.75rem", color: "var(--jood-ink-muted)", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                View all →
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {(invAlerts ?? []).slice(0, 5).map((a) => {
                const item = Array.isArray(a.inventory_items) ? a.inventory_items[0] : a.inventory_items;
                const Icon = ALERT_ICON[a.alert_type] ?? AlertTriangle;
                const WHY: Record<string, string> = {
                  low_stock: "Below the level you set. Restock it, or change the level.",
                  recurring_damage: "Reported damaged or missing on several cleanings. Check how it is used, or replace it.",
                  out_of_service: "Marked out of service on a maintenance ticket.",
                };
                return (
                  <div
                    key={a.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px",
                      backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)",
                      borderLeft: `3px solid ${SEVERITY_COLOR[a.severity]}`, borderRadius: "var(--radius-lg)", flexWrap: "wrap",
                    }}
                  >
                    <Link
                      href={`/admin/ops/inventory/${a.property_id}`}
                      style={{ display: "flex", alignItems: "center", gap: "12px", flex: "1 1 220px", minWidth: 0, textDecoration: "none", color: "inherit" }}
                    >
                      <Icon size={16} strokeWidth={1.75} style={{ flexShrink: 0, color: SEVERITY_COLOR[a.severity] }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--jood-ink)" }}>
                          {a.message ?? (item as { name: string } | null)?.name ?? "Inventory alert"}
                        </p>
                        <p style={{ fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginTop: "2px", lineHeight: 1.45 }}>{WHY[a.alert_type] ?? ""}</p>
                      </div>
                      <span style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: SEVERITY_COLOR[a.severity], flexShrink: 0 }}>
                        {a.severity}
                      </span>
                    </Link>
                    <DismissAlertButton id={a.id} />
                  </div>
                );
              })}
              {total > 5 && (
                <Link href="/admin/ops" style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--jood-ink-subtle)", padding: "8px", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                  +{total - 5} more alert{total - 5 !== 1 ? "s" : ""}
                </Link>
              )}
            </div>
          </div>
        );
      })()}

      {/* Today: arrivals and departures, each a card with the stay's steps */}
      <SectionHead title="Today" count={(arrivals?.length ?? 0) + (departures?.length ?? 0)} href="/admin/bookings" />
      {(arrivals?.length ?? 0) + (departures?.length ?? 0) === 0 && (
        <Empty text="No check-ins or check-outs today." href="/admin/bookings/new" hrefLabel="Add a booking" />
      )}
      {[...(arrivals ?? []).map((b) => ({ b, out: false })), ...(departures ?? []).map((b) => ({ b, out: true }))].map(({ b, out }) => {
        const prop = Array.isArray(b.properties) ? b.properties[0] : b.properties;
        return (
          <RecordCard
            key={b.id + (out ? "o" : "i")}
            href={`/admin/bookings/${b.id}`}
            kicker={out ? "Check-out today" : "Check-in today"}
            state={<State tone={out ? "info" : "warn"}>{out ? "Leaving" : "Arriving"}</State>}
            cols={[{ label: "Guest", value: `${b.guest_first_name} ${b.guest_last_name}` }, { label: "House", value: prop?.name ?? "" }]}
          >
            <StepLine at={out ? 2 : 1} steps={[{ label: "Booked" }, { label: "Checked in" }, { label: "Checked out" }]} />
          </RecordCard>
        );
      })}

      {/* Open requests */}
      <SectionHead title="Guest requests" count={openCount} href="/admin/requests" />
      {openCount === 0 && <Empty text="All clear. No open requests." />}
      {openRequests?.map((r) => {
        const booking = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
        const prop = Array.isArray(booking?.properties) ? booking?.properties[0] : booking?.properties;
        return (
          <RecordCard
            key={r.id}
            href={`/admin/requests/guest/${r.id}`}
            kicker={r.category && r.category !== "other" ? r.category : "Request"}
            state={<State tone={r.urgency === "urgent" ? "danger" : "warn"}>{r.urgency === "urgent" ? "Urgent" : "Open"}</State>}
            cols={[{ label: "Guest", value: `${booking?.guest_first_name ?? ""}${prop?.name ? ` · ${prop.name}` : ""}` }, { label: "Said", value: r.body.length > 60 ? r.body.slice(0, 60) + "…" : r.body }]}
          />
        );
      })}

      {/* Maintenance tickets */}
      <SectionHead title="Maintenance" count={openTickets?.length ?? 0} href="/admin/ops/maintenance" />
      {(openTickets?.length ?? 0) === 0 && <Empty text="No open maintenance tickets." />}
      {openTickets?.map((t) => {
        const prop = Array.isArray(t.properties) ? t.properties[0] : t.properties;
        return (
          <RecordCard
            key={t.id}
            href={`/admin/ops/maintenance/${t.id}`}
            kicker="Ticket"
            state={<State tone={t.priority === "urgent" ? "danger" : "neutral"}>{t.priority === "urgent" ? "Urgent" : "Open"}</State>}
            cols={[{ label: "What", value: t.title }, { label: "House", value: (prop as { name: string } | null)?.name ?? "" }]}
          />
        );
      })}

      {/* Pending service requests */}
      <SectionHead title="Service orders" count={pendingServiceReqs?.length ?? 0} href="/admin/requests" />
      {(pendingServiceReqs?.length ?? 0) === 0 && <Empty text="No pending service orders." />}
      {pendingServiceReqs?.map((r) => {
        const booking = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
        const prop = Array.isArray((booking as { properties?: unknown })?.properties) ? (booking as { properties: { name: string }[] }).properties[0] : (booking as { properties: { name: string } } | null)?.properties;
        const svc = Array.isArray(r.services) ? r.services[0] : r.services;
        return (
          <RecordCard
            key={r.id}
            href={`/admin/requests/service/${r.id}`}
            kicker="Service"
            state={<State tone="info">Waiting</State>}
            cols={[{ label: "Service", value: `${svc?.name_en ?? "Service"}${r.quantity > 1 ? ` ×${r.quantity}` : ""}` }, { label: "Guest", value: `${booking?.guest_first_name ?? ""}${prop?.name ? ` · ${prop.name}` : ""}` }]}
          />
        );
      })}
    </div>
  );
}
