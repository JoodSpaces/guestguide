import { createServiceClient } from "@/lib/supabase/server";

export default async function AdminTodayPage() {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const todayStart = now.slice(0, 10) + "T00:00:00Z";
  const todayEnd = now.slice(0, 10) + "T23:59:59Z";

  const [{ data: arrivals }, { data: departures }, { data: openRequests }] = await Promise.all([
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
            <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.875rem" }}>None today</p>
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
        <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.875rem" }}>All clear</p>
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
