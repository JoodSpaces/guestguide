"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { PresenceAvatars } from "@/components/admin/PresenceAvatars";

const ROLE_COLOR: Record<string, string> = {
  admin: "var(--jood-accent)",
  ops: "var(--jood-aqua)",
  concierge: "var(--jood-garnet)",
};

const PRIMARY_NAV = [
  { href: "/admin",             label: "Today",     roles: ["admin", "ops", "concierge"] },
  { href: "/admin/bookings",    label: "Bookings",  roles: ["admin", "concierge"] },
  { href: "/admin/ops",         label: "Ops",       roles: ["admin", "ops"] },
  { href: "/admin/services",    label: "Services",  roles: ["admin"] },
  { href: "/admin/requests",    label: "Requests",  roles: ["admin", "concierge"] },
];

const SECONDARY_NAV = [
  { href: "/admin/properties",  label: "Properties", roles: ["admin"] },
  { href: "/admin/team",        label: "Team",        roles: ["admin"] },
];

interface Props {
  role: "admin" | "ops" | "concierge";
  name: string;
}

export function AdminHeader({ role, name }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen]       = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const moreRef    = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin/login");
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current    && !moreRef.current.contains(e.target as Node))    setMoreOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (menuRef.current    && !menuRef.current.contains(e.target as Node))    setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const primaryVisible   = PRIMARY_NAV.filter((item) => item.roles.includes(role));
  const secondaryVisible = SECONDARY_NAV.filter((item) => item.roles.includes(role));
  const allNav           = [...primaryVisible, ...secondaryVisible];
  const secondaryActive  = secondaryVisible.some((item) => isActive(item.href));
  const initials         = name ? name.slice(0, 2).toUpperCase() : "?";

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
        padding: "0 12px",
        height: "56px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
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
      <a href="/admin" style={{ display: "block", flexShrink: 0, lineHeight: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/jood-logo-dark.png" alt="JOOD" style={{ height: "22px", width: "auto", display: "block" }} />
      </a>

      <div style={{ width: "1px", height: "20px", backgroundColor: "var(--jood-line)", flexShrink: 0, margin: "0 4px" }} />

      {/* Desktop nav — hidden on mobile via CSS */}
      <nav className="admin-nav-desktop" style={{ display: "flex", gap: "10px", alignItems: "center", flex: 1, minWidth: 0 }}>
        {primaryVisible.map((item) => (
          <a key={item.href} href={item.href} style={linkStyle(isActive(item.href))}>
            {item.label}
          </a>
        ))}

        {secondaryVisible.length > 0 && (
          <div ref={moreRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setMoreOpen((o) => !o)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: "0.875rem",
                color: secondaryActive ? "var(--jood-ink)" : "var(--jood-ink-muted)",
                fontWeight: secondaryActive ? 600 : 400,
                borderBottom: secondaryActive ? "2px solid var(--jood-ink)" : "2px solid transparent",
                paddingBottom: "2px",
                display: "flex", alignItems: "center", gap: "3px",
                whiteSpace: "nowrap", transition: "color 150ms",
              }}
            >
              More
              <span style={{ fontSize: "0.6rem", opacity: 0.7 }}>{moreOpen ? "▲" : "▼"}</span>
            </button>
            {moreOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 10px)", left: 0,
                backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)",
                borderRadius: "var(--radius-lg)", boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                minWidth: "140px", zIndex: 60, overflow: "hidden",
              }}>
                {secondaryVisible.map((item) => (
                  <a key={item.href} href={item.href} onClick={() => setMoreOpen(false)} style={{
                    display: "block", padding: "11px 16px", textDecoration: "none",
                    fontSize: "0.875rem",
                    color: isActive(item.href) ? "var(--jood-ink)" : "var(--jood-ink-muted)",
                    fontWeight: isActive(item.href) ? 600 : 400,
                    backgroundColor: isActive(item.href) ? "var(--jood-surface-raised)" : "transparent",
                    borderBottom: "1px solid var(--jood-line)",
                  }}>
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Spacer for mobile so right side stays pushed right */}
      <div className="admin-nav-mobile-spacer" style={{ flex: 1 }} />

      {/* Right side: presence + profile avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        <PresenceAvatars myName={name} myRole={role} />

        {/* Hamburger — mobile only */}
        <div ref={menuRef} className="admin-hamburger" style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            style={{
              width: "36px", height: "36px",
              background: "none", border: "1px solid var(--jood-line)",
              borderRadius: "var(--radius-md)", cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "5px",
            }}
          >
            <span style={{ width: "16px", height: "1.5px", backgroundColor: "var(--jood-ink)", borderRadius: "2px", display: "block" }} />
            <span style={{ width: "16px", height: "1.5px", backgroundColor: "var(--jood-ink)", borderRadius: "2px", display: "block" }} />
            <span style={{ width: "16px", height: "1.5px", backgroundColor: "var(--jood-ink)", borderRadius: "2px", display: "block" }} />
          </button>
          {menuOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)",
              borderRadius: "var(--radius-lg)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              minWidth: "200px", zIndex: 60, overflow: "hidden",
            }}>
              {allNav.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{
                  display: "block", padding: "13px 18px", textDecoration: "none",
                  fontSize: "0.9375rem",
                  color: isActive(item.href) ? "var(--jood-ink)" : "var(--jood-ink-muted)",
                  fontWeight: isActive(item.href) ? 600 : 400,
                  backgroundColor: isActive(item.href) ? "var(--jood-surface-raised)" : "transparent",
                  borderBottom: "1px solid var(--jood-line)",
                }}>
                  {item.label}
                </a>
              ))}
              <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--jood-line)" }}>
                <p style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--jood-ink)" }}>{name || "Admin"}</p>
                <p style={{ fontSize: "0.7rem", color: "var(--jood-ink-ghost)", marginTop: "2px", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{role}</p>
              </div>
              <button onClick={handleLogout} style={{
                display: "block", width: "100%", padding: "13px 18px",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: "0.9375rem",
                color: "var(--jood-danger)", textAlign: "left",
              }}>
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Profile avatar — desktop only */}
        <div ref={profileRef} className="admin-profile-desktop" style={{ position: "relative" }}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            title={name}
            style={{
              width: "32px", height: "32px", borderRadius: "50%",
              backgroundColor: ROLE_COLOR[role], border: "none", cursor: "pointer",
              fontFamily: "var(--font-label)", fontWeight: 700,
              fontSize: "0.65rem", letterSpacing: "0.06em", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "opacity 150ms",
            }}
          >
            {initials}
          </button>
          {profileOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 10px)", right: 0,
              backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)",
              borderRadius: "var(--radius-lg)", boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
              minWidth: "160px", zIndex: 60, overflow: "hidden",
            }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--jood-line)" }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--jood-ink)" }}>{name || "Admin"}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--jood-ink-ghost)", marginTop: "2px", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{role}</p>
              </div>
              <button onClick={handleLogout} style={{
                display: "block", width: "100%", padding: "11px 16px",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: "0.875rem",
                color: "var(--jood-danger)", textAlign: "left",
              }}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 640px) {
          .admin-nav-desktop          { display: flex !important; }
          .admin-nav-mobile-spacer    { display: none !important; }
          .admin-hamburger            { display: none !important; }
          .admin-profile-desktop      { display: block !important; }
        }
        @media (max-width: 639px) {
          .admin-nav-desktop          { display: none !important; }
          .admin-nav-mobile-spacer    { display: block !important; }
          .admin-hamburger            { display: block !important; }
          .admin-profile-desktop      { display: none !important; }
        }
      `}</style>
    </header>
  );
}
