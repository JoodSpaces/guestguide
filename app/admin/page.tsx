import { createServiceClient } from "@/lib/supabase/server";

export default async function AdminTodayPage() {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const todayStart = now.slice(0, 10) + "T00:00:00Z";
  const todayEnd = now.slice(0, 10) + "T23:59:59Z";

  const [{ data: arrivals }, { data: departures }, { data: openRequests }, { data: properties }, { data: activeTurnovers }, { data: urgentTickets }, { data: pendingServiceReqs }] = await Promise.all([
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
      .from("requests")
      .select("id, category, urgency, created_at, bookings(guest_first_name, properties(name))")
      .in("status", ["received", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<{ id: string; category: string; urgency: string; created_at: string; bookings: { guest_first_name: string; properties: { name: string } } }[]>(),
    supabase.from("properties").select("id, name"),
    supabase.from("turnover_tasks").select("property_id, status").in("status", ["pending", "in_progress"]),
    supabase.from("maintenance_tickets").select("property_id").eq("priority", "urgent").neq("status", "resolved"),
    supabase.from("service_requests").select("id, bookings(property_id)").eq("status", "pending"),
  ]);

  const Section = ({ title, count }: { title: string; count: number }) => (
    <p className="label-eyebrow" style={{ color: "var(--jood-ink-muted)", marginBottom: "16px" }}>
      {title}
      <span
        style={{
          marginInlineStart: "8px",
          backgroundColor: count > 0 ? "var(--jood-accent)" : "var(--jood-line)",
          color: count > 0 ? "white" : "var(--jood-ink-muted)",
          borderRadius: "20px",
          padding: "2px 8px",
          fontSize: "0.7rem",
        }}
      >
        {count}
      </span>
    </p>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
        <h1 className="font-display" style={{ fontSize: "1.8rem" }}>
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </h1>
        <a
          href="/admin/bookings/new"
          style={{
            padding: "10px 20px",
            backgroundColor: "var(--jood-ink)",
            color: "var(--jood-ground)",
            borderRadius: "var(--radius-pill)",
            textDecoration: "none",
            fontSize: "0.875rem",
          }}
        >
          + New booking
        </a>
      </div>

      {/* Property status rings */}
      {(properties?.length ?? 0) > 0 && (() => {
        const turnoversPerProp = new Set(activeTurnovers?.map((t) => t.property_id) ?? []);
        const urgentPerProp = new Set(urgentTickets?.map((t) => t.property_id) ?? []);
        const pendingPerProp = new Set(
          (pendingServiceReqs ?? []).map((r) => {
            const b = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
            return (b as { property_id: string } | null)?.property_id;
          }).filter(Boolean)
        );

        function status(pid: string): "clear" | "amber" | "red" {
          if (urgentPerProp.has(pid)) return "red";
          if (turnoversPerProp.has(pid) || pendingPerProp.has(pid)) return "amber";
          return "clear";
        }

        const STATUS_COLOR = { clear: "#4ade80", amber: "#f59e0b", red: "#f87171" };
        const STATUS_BG = { clear: "rgba(74,222,128,0.08)", amber: "rgba(245,158,11,0.08)", red: "rgba(248,113,113,0.08)" };
        const STATUS_LABEL = { clear: "All clear", amber: "Needs attention", red: "Urgent" };

        return (
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "14px", flexWrap: "wrap" }}>
              <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)" }}>
                Properties
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                {(["clear", "amber", "red"] as const).map((s) => (
                  <span key={s} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.65rem", color: "var(--jood-ink-ghost)", fontFamily: "var(--font-label)", letterSpacing: "0.08em" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: STATUS_COLOR[s], display: "inline-block" }} />
                    {s === "clear" ? "All clear" : s === "amber" ? "Attention" : "Urgent"}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {properties!.map((p) => {
                const s = status(p.id);
                const col = STATUS_COLOR[s];
                const r = 18;
                const circ = 2 * Math.PI * r;
                const pct = s === "clear" ? 1 : s === "amber" ? 0.6 : 0.85;
                return (
                  <a
                    key={p.id}
                    href={`/admin/ops/inventory/${p.id}`}
                    title={STATUS_LABEL[s]}
                    style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}
                  >
                    <div style={{ position: "relative", width: "52px", height: "52px" }}>
                      <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                        <circle cx="26" cy="26" r={r} stroke="var(--jood-line)" strokeWidth="2.5" fill={STATUS_BG[s]} />
                        <circle
                          cx="26" cy="26" r={r}
                          stroke={col}
                          strokeWidth="2.5"
                          fill="none"
                          strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
                          strokeLinecap="round"
                          transform="rotate(-90 26 26)"
                          style={{ transition: "stroke-dasharray 800ms ease" }}
                        />
                      </svg>
                      <span style={{
                        position: "absolute", inset: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.75rem",
                      }}>
                        {s === "clear" ? "✓" : s === "red" ? "!" : "~"}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.6875rem", color: "var(--jood-ink-muted)", textAlign: "center", maxWidth: "64px", lineHeight: 1.3 }}>{p.name}</p>
                  </a>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        {/* Arrivals */}
        <div
          style={{
            backgroundColor: "var(--jood-surface)",
            border: "1px solid var(--jood-line)",
            borderRadius: "var(--radius-lg)",
            padding: "20px",
          }}
        >
          <Section title="Arrivals" count={arrivals?.length ?? 0} />
          {arrivals?.length === 0 && (
            <div>
              <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.875rem" }}>None today</p>
              <a href="/admin/bookings/new" style={{ display: "inline-block", marginTop: "10px", fontSize: "0.8rem", color: "var(--jood-ink-muted)", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                + Add a booking
              </a>
            </div>
          )}
          {arrivals?.map((b) => {
            const prop = Array.isArray(b.properties) ? b.properties[0] : b.properties;
            return (
              <a
                key={b.id}
                href={`/admin/bookings/${b.id}`}
                style={{ display: "block", textDecoration: "none", marginBottom: "10px" }}
              >
                <p style={{ color: "var(--jood-ink)", fontWeight: 500, fontSize: "0.9375rem" }}>
                  {b.guest_first_name} {b.guest_last_name}
                </p>
                <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.8125rem" }}>{prop?.name}</p>
              </a>
            );
          })}
        </div>

        {/* Departures */}
        <div
          style={{
            backgroundColor: "var(--jood-surface)",
            border: "1px solid var(--jood-line)",
            borderRadius: "var(--radius-lg)",
            padding: "20px",
          }}
        >
          <Section title="Departures" count={departures?.length ?? 0} />
          {departures?.length === 0 && (
            <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.875rem" }}>None today</p>
          )}

          {departures?.map((b) => {
            const prop = Array.isArray(b.properties) ? b.properties[0] : b.properties;
            return (
              <a
                key={b.id}
                href={`/admin/bookings/${b.id}`}
                style={{ display: "block", textDecoration: "none", marginBottom: "10px" }}
              >
                <p style={{ color: "var(--jood-ink)", fontWeight: 500, fontSize: "0.9375rem" }}>
                  {b.guest_first_name} {b.guest_last_name}
                </p>
                <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.8125rem" }}>{prop?.name}</p>
              </a>
            );
          })}
        </div>
      </div>

      {/* Open requests */}
      <Section title="Open requests" count={openRequests?.length ?? 0} />
      {openRequests?.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px 20px", backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)" }}>
          <span style={{ fontSize: "1.1rem" }}>✓</span>
          <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.875rem" }}>All clear — no open requests</p>
        </div>
      )}
      {openRequests?.map((r) => {
        const booking = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
        const prop = Array.isArray(booking?.properties) ? booking?.properties[0] : booking?.properties;
        return (
          <a
            key={r.id}
            href={`/admin/requests/${r.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              backgroundColor: "var(--jood-surface)",
              border: "1px solid var(--jood-line)",
              borderRadius: "var(--radius-lg)",
              textDecoration: "none",
              marginBottom: "8px",
            }}
          >
            <div>
              <p style={{ color: "var(--jood-ink)", fontWeight: 500, fontSize: "0.9375rem" }}>
                {booking?.guest_first_name} — {r.category}
              </p>
              <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.8125rem" }}>{prop?.name}</p>
            </div>
            {r.urgency === "urgent" && (
              <span
                style={{
                  backgroundColor: "var(--jood-danger)",
                  color: "white",
                  fontSize: "0.6875rem",
                  padding: "3px 8px",
                  borderRadius: "20px",
                  fontFamily: "var(--font-label)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Urgent
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}
