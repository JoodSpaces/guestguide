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

  return (
    <div>
      <AutoRefresh interval={30_000} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
        <h1 className="font-display" style={{ fontSize: "1.8rem" }}>Operations</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <a href="/admin/ops/maintenance/new" style={{ padding: "9px 18px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", textDecoration: "none", color: "var(--jood-ink)", fontSize: "0.875rem" }}>
            + Ticket
          </a>
          <a href="#" onClick={undefined} style={{ padding: "9px 18px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", borderRadius: "var(--radius-pill)", textDecoration: "none", fontSize: "0.875rem" }}
            id="new-turnover-btn"
          >
            + Turnover
          </a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Turnovers */}
        <section>
          {(() => {
            const active = turnovers?.filter((t) => t.status !== "scheduled") ?? [];
            const upcoming = turnovers?.filter((t) => t.status === "scheduled") ?? [];

            type TurnoverRow = NonNullable<typeof turnovers>[number] & { approved_at?: string | null };

            function TurnoverCard({ t, muted }: { t: TurnoverRow; muted?: boolean }) {
              const booking = Array.isArray(t.bookings) ? t.bookings[0] : t.bookings;
              const property = Array.isArray(t.properties) ? t.properties[0] : t.properties;
              return (
                <a href={`/admin/ops/turnover/${t.id}`} style={{ ...card, textDecoration: "none", color: "inherit", display: "block", opacity: muted ? 0.6 : 1, borderLeft: t.status === "scheduled" ? `3px solid var(--jood-aqua)` : "1px solid var(--jood-line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: "0.9375rem", marginBottom: "3px" }}>{(property as { name: string })?.name}</p>
                      {booking && (
                        <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>
                          {(booking as { guest_first_name: string }).guest_first_name} · checkout {fmt((booking as { check_out: string }).check_out)}
                        </p>
                      )}
                      {t.assigned_to && <p style={{ fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginTop: "2px" }}>→ {t.assigned_to}</p>}
                      {t.status === "approved" && (t as TurnoverRow).approved_at && (
                        <p style={{ fontSize: "0.75rem", color: "var(--jood-ink-ghost)", marginTop: "2px" }}>
                          Approved {fmt((t as TurnoverRow).approved_at!)}
                        </p>
                      )}
                    </div>
                    <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: STATUS_COLOR[t.status] }}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                </a>
              );
            }

            return (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)" }}>
                    Active · {active.length}
                  </p>
                  <NewTurnoverForm properties={properties ?? []} />
                </div>

                {!active.length && (
                  <div style={{ ...card, color: "var(--jood-ink-muted)", textAlign: "center", padding: "24px", marginBottom: "20px" }}>No active turnovers</div>
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
                    <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-ghost)", marginBottom: "10px", marginTop: active.length || upcoming.length ? "20px" : 0 }}>
                      History · {history!.length}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {history!.map((t) => <TurnoverCard key={t.id} t={t as TurnoverRow} muted />)}
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </section>

        {/* Maintenance tickets */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)" }}>
              Open tickets · {tickets?.length ?? 0}
            </p>
            <a href="/admin/ops/maintenance" style={{ fontSize: "0.75rem", color: "var(--jood-ink-muted)", textDecoration: "none" }}>View all →</a>
          </div>

          {!tickets?.length && (
            <div style={{ ...card, color: "var(--jood-ink-muted)", textAlign: "center", padding: "32px" }}>No open tickets</div>
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
                    <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: PRIORITY_COLOR[ticket.priority] }}>
                      {ticket.priority}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
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
