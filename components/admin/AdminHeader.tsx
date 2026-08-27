"use client";

import { useRouter } from "next/navigation";

export function AdminHeader() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin/login");
  }

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
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--jood-ink-muted)",
            borderLeft: "1px solid var(--jood-line)",
            paddingLeft: "16px",
          }}
        >
          Admin
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <nav style={{ display: "flex", gap: "24px" }}>
          {[
            { href: "/admin", label: "Today" },
            { href: "/admin/bookings", label: "Bookings" },
            { href: "/admin/requests", label: "Requests" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                color: "var(--jood-ink-muted)",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          style={{
            background: "none",
            border: "1px solid var(--jood-line)",
            borderRadius: "var(--radius-pill)",
            padding: "5px 12px",
            fontSize: "0.75rem",
            color: "var(--jood-ink-muted)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
