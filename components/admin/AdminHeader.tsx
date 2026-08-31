"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { PresenceAvatars } from "@/components/admin/PresenceAvatars";

const ROLE_COLOR: Record<string, string> = {
  admin: "var(--jood-accent)",
  ops: "var(--jood-aqua)",
  concierge: "var(--jood-warning)",
};

// Primary nav: always visible
const PRIMARY_NAV = [
  { href: "/admin", label: "Today", roles: ["admin", "ops", "concierge"] },
  { href: "/admin/bookings", label: "Bookings", roles: ["admin", "concierge"] },
  { href: "/admin/ops", label: "Ops", roles: ["admin", "ops"] },
  { href: "/admin/services", label: "Services", roles: ["admin"] },
  { href: "/admin/requests", label: "Requests", roles: ["admin", "concierge"] },
];

// Secondary nav: in the "More" dropdown
const SECONDARY_NAV = [
  { href: "/admin/properties", label: "Properties", roles: ["admin"] },
  { href: "/admin/team", label: "Team", roles: ["admin"] },
];

interface Props {
  role: "admin" | "ops" | "concierge";
  name: string;
}

export function AdminHeader({ role, name }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin/login");
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const primaryVisible = PRIMARY_NAV.filter((item) => item.roles.includes(role));
  const secondaryVisible = SECONDARY_NAV.filter((item) => item.roles.includes(role));
  const secondaryActive = secondaryVisible.some((item) => isActive(item.href));

  const initials = name ? name.slice(0, 2).toUpperCase() : "?";

  const linkStyle = (active: boolean): React.CSSProperties => ({
    color: active ? "var(--jood-ink)" : "var(--jood-ink-muted)",
    textDecoration: "none",
    fontSize: "0.875rem",
    fontWeight: active ? 600 : 400,
    borderBottom: active ? "2px solid var(--jood-ink)" : "2px solid transparent",
    paddingBottom: "2px",
    transition: "color 150ms, border-color 150ms",
    whiteSpace: "nowrap",
  });

  return (
    <header
      style={{
        padding: "0 16px",
        height: "56px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        borderBottom: "1px solid var(--jood-line)",
        position: "sticky",
        top: 0,
        backgroundColor: "rgba(245,244,237,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        zIndex: 40,
      }}
    >
      {/* Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/jood-logo-dark.png" alt="JOOD" style={{ height: "22px", width: "auto", display: "block", flexShrink: 0 }} />

      <div style={{ width: "1px", height: "20px", backgroundColor: "var(--jood-line)", flexShrink: 0, margin: "0 4px" }} />

      {/* Primary nav */}
      <nav style={{ display: "flex", gap: "16px", alignItems: "center", flex: 1, minWidth: 0 }}>
        {primaryVisible.map((item) => (
          <a key={item.href} href={item.href} style={linkStyle(isActive(item.href))}>
            {item.label}
          </a>
        ))}

        {/* More dropdown */}
        {secondaryVisible.length > 0 && (
          <div ref={moreRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setMoreOpen((o) => !o)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "0.875rem",
                color: secondaryActive ? "var(--jood-ink)" : "var(--jood-ink-muted)",
                fontWeight: secondaryActive ? 600 : 400,
                borderBottom: secondaryActive ? "2px solid var(--jood-ink)" : "2px solid transparent",
                paddingBottom: "2px",
                display: "flex",
                alignItems: "center",
                gap: "3px",
                whiteSpace: "nowrap",
                transition: "color 150ms",
              }}
            >
              More
              <span style={{ fontSize: "0.6rem", opacity: 0.7 }}>{moreOpen ? "▲" : "▼"}</span>
            </button>
            {moreOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                left: 0,
                backgroundColor: "var(--jood-surface)",
                border: "1px solid var(--jood-line)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                minWidth: "140px",
                zIndex: 60,
                overflow: "hidden",
              }}>
                {secondaryVisible.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    style={{
                      display: "block",
                      padding: "11px 16px",
                      textDecoration: "none",
                      fontSize: "0.875rem",
                      color: isActive(item.href) ? "var(--jood-ink)" : "var(--jood-ink-muted)",
                      fontWeight: isActive(item.href) ? 600 : 400,
                      backgroundColor: isActive(item.href) ? "var(--jood-surface-raised)" : "transparent",
                      borderBottom: "1px solid var(--jood-line)",
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Right side: presence + profile avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <PresenceAvatars myName={name} myRole={role} />

        {/* Profile avatar with dropdown */}
        <div ref={profileRef} style={{ position: "relative" }}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            title={name}
            style={{
              width: "32px", height: "32px",
              borderRadius: "50%",
              backgroundColor: ROLE_COLOR[role],
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-label)",
              fontWeight: 700,
              fontSize: "0.65rem",
              letterSpacing: "0.06em",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "opacity 150ms",
            }}
          >
            {initials}
          </button>
          {profileOpen && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 10px)",
              right: 0,
              backgroundColor: "var(--jood-surface)",
              border: "1px solid var(--jood-line)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
              minWidth: "160px",
              zIndex: 60,
              overflow: "hidden",
            }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--jood-line)" }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--jood-ink)" }}>{name || "Admin"}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--jood-ink-ghost)", marginTop: "2px", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{role}</p>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  display: "block", width: "100%", padding: "11px 16px",
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: "0.875rem",
                  color: "var(--jood-danger)", textAlign: "left",
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
