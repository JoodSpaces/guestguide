import { createServiceClient } from "@/lib/supabase/server";

type Booking = {
  id: string;
  guest_first_name: string;
  guest_last_name: string;
  check_in: string;
  check_out: string;
  status: string;
  source: string;
  properties: { name: string } | { name: string }[];
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_COLOR: Record<string, string> = {
  confirmed: "var(--jood-accent)",
  cancelled: "var(--jood-danger)",
  completed: "var(--jood-ink-muted)",
};

export default async function AdminBookingsPage() {
  const supabase = createServiceClient();
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, guest_first_name, guest_last_name, check_in, check_out, status, source, properties(name)")
    .order("check_in", { ascending: false })
    .returns<Booking[]>();

  if (error) console.error("bookings list error:", error);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
        <h1 className="font-display" style={{ fontSize: "1.8rem" }}>Bookings</h1>
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

      {!bookings?.length && (
        <p style={{ color: "var(--jood-ink-muted)" }}>No bookings yet.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {bookings?.map((b) => {
          const prop = Array.isArray(b.properties) ? b.properties[0] : b.properties;
          const statusColor = STATUS_COLOR[b.status] ?? "var(--jood-ink-muted)";
          const today = new Date().toISOString().slice(0, 10);
          const isActive = b.check_in <= today && b.check_out >= today;
          return (
            <a
              key={b.id}
              href={`/admin/bookings/${b.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: "16px",
                padding: "16px 20px",
                backgroundColor: isActive ? "var(--jood-surface-raised)" : "var(--jood-surface)",
                border: `1px solid ${isActive ? "var(--jood-accent)" : "var(--jood-line)"}`,
                borderRadius: "var(--radius-lg)",
                opacity: b.status === "cancelled" ? 0.5 : 1,
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              <div>
                <p style={{ color: "var(--jood-ink)", fontWeight: 500, fontSize: "0.9375rem", marginBottom: "4px" }}>
                  {b.guest_first_name} {b.guest_last_name}
                </p>
                <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.8125rem" }}>
                  {prop?.name} · {fmt(b.check_in)} → {fmt(b.check_out)}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                <span
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "9px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: statusColor,
                  }}
                >
                  {isActive ? "● " : ""}{b.status}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "9px",
                    letterSpacing: "0.08em",
                    color: "var(--jood-ink-muted)",
                    opacity: 0.55,
                    textTransform: "uppercase",
                  }}
                >
                  {b.source}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
