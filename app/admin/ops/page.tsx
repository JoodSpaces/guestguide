import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { AutoRefresh } from "@/components/admin/AutoRefresh";

const STATUS_COLOR: Record<string, string> = {
  scheduled: "var(--jood-aqua)",
  pending: "var(--jood-ink-muted)",
  in_progress: "var(--jood-warning)",
  ready: "var(--jood-success)",
  approved: "var(--jood-aqua)",
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "var(--jood-danger)",
  normal: "var(--jood-ink-muted)",
  low: "var(--jood-ink-ghost)",
};

// Plain-language labels for staff
const STATUS_LABEL: Record<string, string> = {
  scheduled: "Upcoming",
  pending: "Ready to start",
  in_progress: "In progress",
  ready: "Waiting for approval",
  approved: "Done ✓",
};

function StatusChip({ value, colorMap }: { value: string; colorMap: Record<string, string> }) {
  const color = colorMap[value] ?? "var(--jood-ink-muted)";
  const label = STATUS_LABEL[value] ?? value.replace("_", " ");
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.1em",
      textTransform: "uppercase", color,
      border: `1px solid ${color}`, borderRadius: "var(--radius-pill)",
      padding: "3px 8px", whiteSpace: "nowrap", flexShrink: 0,
    }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const card: React.CSSProperties = {
  backgroundColor: "var(--jood-surface)",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-lg)",
  padding: "16px 20px",
};

export default async function OpsPage() {
  const h = await headers();
  const myName = h.get("x-admin-name") ?? "";
  const role   = (h.get("x-admin-role") ?? "admin") as "admin" | "ops" | "concierge";

  const supabase = createServiceClient();

  const [
    { data: turnovers },
    { data: history },
    { data: tickets },
    { data: properties },
  ] = await Promise.all([
    supabase
      .from("turnover_tasks")
      .select("id, status, assigned_to, created_at, properties(id, name), bookings(check_out, guest_first_name, guest_last_name)")
      .in("status", ["scheduled", "pending", "in_progress", "ready"])
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("turnover_tasks")
      .select("id, status, assigned_to, approved_at, created_at, properties(id, name), bookings(check_out, guest_first_name, guest_last_name)")
      .eq("status", "approved")
      .order("approved_at", { ascending: false })
      .limit(20),
    supabase
      .from("maintenance_tickets")
      .select("id, title, priority, status, created_at, properties(id, name)")
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("properties").select("id, name").order("name"),
  ]);

  type TurnoverRow = NonNullable<typeof turnovers>[number] & { approved_at?: string | null };

  function TurnoverCard({ t, muted, highlight }: { t: TurnoverRow; muted?: boolean; highlight?: boolean }) {
    const booking  = Array.isArray(t.bookings)    ? t.bookings[0]    : t.bookings;
    const property = Array.isArray(t.properties)  ? t.properties[0]  : t.properties;
    return (
      <a href={`/admin/ops/turnover/${t.id}`} style={{
        ...card,
        textDecoration: "none", color: "inherit", display: "block",
        opacity: muted ? 0.6 : 1,
        borderLeft: highlight
          ? "4px solid var(--jood-accent)"
          : t.status === "scheduled"
          ? "3px solid var(--jood-aqua)"
          : "1px solid var(--jood-line)",
        backgroundColor: highlight ? "var(--jood-surface-raised)" : "var(--jood-surface)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "3px" }}>{(property as { name: string })?.name}</p>
            {booking && (
              <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>
                {(booking as { guest_first_name: string }).guest_first_name} · checkout {fmt((booking as { check_out: string }).check_out)}
              </p>
            )}
            {t.assigned_to && (
              <p style={{ fontSize: "0.8125rem", color: highlight ? "var(--jood-accent)" : "var(--jood-ink-muted)", marginTop: "3px", fontWeight: highlight ? 600 : 400 }}>
                👤 {t.assigned_to}
              </p>
            )}
            {t.status === "approved" && (t as TurnoverRow).approved_at && (
              <p style={{ fontSize: "0.75rem", color: "var(--jood-ink-ghost)", marginTop: "2px" }}>
                Approved {fmt((t as TurnoverRow).approved_at!)}
              </p>
            )}
          </div>
          <StatusChip value={t.status} colorMap={STATUS_COLOR} />
        </div>
      </a>
    );
  }

  // Split: mine vs others
  const myTurnovers    = turnovers?.filter((t) => t.assigned_to === myName) ?? [];
  const otherTurnovers = turnovers?.filter((t) => t.assigned_to !== myName) ?? [];
  const active         = otherTurnovers.filter((t) => t.status !== "scheduled");
  const upcoming       = otherTurnovers.filter((t) => t.status === "scheduled");

  return (
    <div>
      <AutoRefresh interval={30_000} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <h1 className="font-display" style={{ fontSize: "1.8rem" }}>Operations</h1>
        {role === "admin" && (
          <div style={{ display: "flex", gap: "10px" }}>
            <a href="/admin/ops/maintenance/new" style={{ padding: "9px 18px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", textDecoration: "none", color: "var(--jood-ink)", fontSize: "0.875rem" }}>
              + Ticket
            </a>
          </div>
        )}
      </div>

      {/* ── MY TASKS — always shown first ── */}
      {myTurnovers.length > 0 && (
        <section style={{ marginBottom: "36px" }}>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-accent)", marginBottom: "10px" }}>
            Your tasks · {myTurnovers.length}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {myTurnovers.map((t) => (
              <TurnoverCard key={t.id} t={t as TurnoverRow} highlight />
            ))}
          </div>
        </section>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
        {/* Turnovers */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)" }}>
              {myTurnovers.length > 0 ? "All other tasks" : "Active"} · {active.length + upcoming.length}
            </p>
            <NewTurnoverForm properties={properties ?? []} />
          </div>

          {!active.length && !upcoming.length && !myTurnovers.length && (
            <div style={{ ...card, textAlign: "center", padding: "32px 24px", marginBottom: "20px" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "10px" }}>🧹</div>
              <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--jood-ink-muted)", marginBottom: "4px" }}>All clear</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-ghost)" }}>No active turnovers right now</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: upcoming.length ? "20px" : 0 }}>
            {active.map((t) => <TurnoverCard key={t.id} t={t as TurnoverRow} />)}
          </div>

          {upcoming.length > 0 && (
            <>
              <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-aqua)", marginBottom: "10px", marginTop: "4px" }}>
                Upcoming · {upcoming.length}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: history?.length ? "20px" : 0 }}>
                {upcoming.map((t) => <TurnoverCard key={t.id} t={t as TurnoverRow} />)}
              </div>
            </>
          )}

          {(history?.length ?? 0) > 0 && (
            <>
              <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-ghost)", marginBottom: "10px", marginTop: "20px" }}>
                History · {history!.length}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {history!.map((t) => <TurnoverCard key={t.id} t={t as TurnoverRow} muted />)}
              </div>
            </>
          )}
        </section>

        {/* Maintenance tickets — admin/ops only */}
        {role !== "concierge" && (
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)" }}>
                Open tickets · {tickets?.length ?? 0}
              </p>
              <a href="/admin/ops/maintenance" style={{ fontSize: "0.75rem", color: "var(--jood-ink-muted)", textDecoration: "none" }}>View all →</a>
            </div>

            {!tickets?.length && (
              <div style={{ ...card, textAlign: "center", padding: "32px 24px" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "10px" }}>🔧</div>
                <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--jood-ink-muted)", marginBottom: "4px" }}>No open tickets</p>
                <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-ghost)" }}>All maintenance issues are resolved</p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {tickets?.map((ticket) => {
                const property = Array.isArray(ticket.properties) ? ticket.properties[0] : ticket.properties;
                return (
                  <a key={ticket.id} href={`/admin/ops/maintenance/${ticket.id}`} style={{ ...card, textDecoration: "none", color: "inherit", display: "block", borderLeft: ticket.priority === "urgent" ? "3px solid var(--jood-danger)" : "1px solid var(--jood-line)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p style={{ fontWeight: 500, fontSize: "0.9375rem", marginBottom: "3px" }}>{ticket.title}</p>
                        <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>{(property as { name: string })?.name} · {fmt(ticket.created_at)}</p>
                      </div>
                      <StatusChip value={ticket.priority} colorMap={PRIORITY_COLOR} />
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Inventory links */}
      {(properties?.length ?? 0) > 0 && (
        <section style={{ marginTop: "32px" }}>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "12px" }}>Inventory</p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {properties?.map((p) => (
              <a key={p.id} href={`/admin/ops/inventory/${p.id}`} style={{ ...card, textDecoration: "none", color: "var(--jood-ink)", fontSize: "0.875rem", padding: "10px 16px" }}>
                {p.name} →
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Inline new-turnover form — server page with client island
function NewTurnoverForm({ properties }: { properties: { id: string; name: string }[] }) {
  return (
    <form action="/api/admin/ops/turnover" method="POST" style={{ display: "none" }}>
      {properties.map((p) => (
        <input key={p.id} type="hidden" name="propertyId" value={p.id} />
      ))}
    </form>
  );
}
