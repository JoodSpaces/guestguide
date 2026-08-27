"use client";

import { useRouter } from "next/navigation";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  ops: "Ops",
  concierge: "Concierge",
};

const ROLE_COLOR: Record<string, string> = {
  admin: "var(--jood-accent)",
  ops: "var(--jood-aqua)",
  concierge: "var(--jood-warning)",
};

const NAV_ITEMS = [
  { href: "/admin", label: "Today", roles: ["admin", "ops", "concierge"] },
  { href: "/admin/bookings", label: "Bookings", roles: ["admin", "concierge"] },
  { href: "/admin/ops", label: "Ops", roles: ["admin", "ops"] },
  { href: "/admin/services", label: "Services", roles: ["admin"] },
  { href: "/admin/requests", label: "Requests", roles: ["admin", "concierge"] },
  { href: "/admin/team", label: "Team", roles: ["admin"] },
];

interface Props {
  role: "admin" | "ops" | "concierge";
  name: string;
}

export function AdminHeader({ role, name }: Props) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin/login");
  }

  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <header
      style={{
        padding: "0 24px",
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--jood-line)",
        position: "sticky",
        top: 0,
        backgroundColor: "rgba(245,244,237,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        zIndex: 40,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/jood-logo-dark.png" alt="JOOD" style={{ height: "24px", width: "auto", display: "block" }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: ROLE_COLOR[role], borderLeft: "1px solid var(--jood-line)", paddingLeft: "16px" }}>
          {ROLE_LABEL[role]}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <nav style={{ display: "flex", gap: "24px" }}>
          {visibleNav.map((item) => (
            <a key={item.href} href={item.href} style={{ color: "var(--jood-ink-muted)", textDecoration: "none", fontSize: "0.875rem" }}>
              {item.label}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {name && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--jood-ink-muted)" }}>
              {name}
            </span>
          )}
          <button
            onClick={handleLogout}
            style={{ background: "none", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", padding: "5px 12px", fontSize: "0.75rem", color: "var(--jood-ink-muted)", cursor: "pointer", fontFamily: "inherit" }}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
