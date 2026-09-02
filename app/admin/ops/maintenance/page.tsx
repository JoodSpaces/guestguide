import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "var(--jood-danger)",
  normal: "var(--jood-ink-muted)",
  low: "var(--jood-ink-ghost)",
};

const STATUS_COLOR: Record<string, string> = {
  open: "var(--jood-accent)",
  in_progress: "var(--jood-accent)",
  resolved: "var(--jood-success)",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const card: React.CSSProperties = {
  backgroundColor: "var(--jood-surface)",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-lg)",
  padding: "14px 18px",
  textDecoration: "none",
  color: "inherit",
  display: "block",
};

export default async function MaintenancePage() {
  const supabase = createServiceClient();
  const { data: tickets } = await supabase
    .from("maintenance_tickets")
    .select("id, title, category, priority, status, assigned_to, created_at, properties(id, name)")
    .order("created_at", { ascending: false })
    .limit(100);

  const open = tickets?.filter((t) => t.status !== "resolved") ?? [];
  const resolved = tickets?.filter((t) => t.status === "resolved") ?? [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <Link href="/admin/ops" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--jood-ink-muted)", textDecoration: "none", fontSize: "0.8125rem", marginBottom: "8px" }}>← Ops</Link>
          <h1 className="font-display" style={{ fontSize: "1.8rem" }}>Maintenance</h1>
        </div>
        <Link href="/admin/ops/maintenance/new" style={{ padding: "10px 20px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", borderRadius: "var(--radius-pill)", textDecoration: "none", fontSize: "0.875rem" }}>
          + New ticket
        </Link>
      </div>

      {/* Open */}
      <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "10px" }}>Open · {open.length}</p>
      {!open.length && <div style={{ ...card, color: "var(--jood-ink-muted)", textAlign: "center", padding: "32px", marginBottom: "24px" }}>No open tickets</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "32px" }}>
        {open.map((t) => {
          const property = Array.isArray(t.properties) ? t.properties[0] : t.properties;
          return (
            <Link key={t.id} href={`/admin/ops/maintenance/${t.id}`} style={{ ...card, borderLeft: t.priority === "urgent" ? "3px solid var(--jood-danger)" : "1px solid var(--jood-line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontWeight: 500, fontSize: "0.9375rem", marginBottom: "3px" }}>{t.title}</p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>
                    {(property as { name: string })?.name} · <span style={{ textTransform: "capitalize" }}>{t.category}</span> · {fmt(t.created_at)}
                  </p>
                  {t.assigned_to && <p style={{ fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginTop: "2px" }}>→ {t.assigned_to}</p>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                  <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: STATUS_COLOR[t.status] }}>{t.status.replace("_", " ")}</span>
                  <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: PRIORITY_COLOR[t.priority] }}>{t.priority}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "10px" }}>Resolved · {resolved.length}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", opacity: 0.55 }}>
            {resolved.slice(0, 10).map((t) => {
              const property = Array.isArray(t.properties) ? t.properties[0] : t.properties;
              return (
                <Link key={t.id} href={`/admin/ops/maintenance/${t.id}`} style={card}>
                  <p style={{ fontWeight: 500, fontSize: "0.875rem" }}>{t.title}</p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>{(property as { name: string })?.name} · {fmt(t.created_at)}</p>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
