"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Activity, CalendarDays, ChevronDown, ChevronUp, ClipboardList, ConciergeBell, LayoutDashboard, Menu, MessageCircle, Sparkles, Wrench } from "lucide-react";

const ROLE_HOME: Record<string, string> = {
  admin:        "/admin",
  ops:          "/admin/ops",
  housekeeping: "/admin/ops",
  maintenance:  "/admin/ops/maintenance",
  concierge:    "/admin/requests",
};
import { PresenceAvatars } from "@/components/admin/PresenceAvatars";

const ROLE_COLOR: Record<string, string> = {
  admin:        "var(--jood-accent)",
  ops:          "var(--jood-aqua)",
  housekeeping: "var(--jood-aqua)",
  maintenance:  "var(--jood-garnet)",
  concierge:    "var(--jood-garnet)",
};

const PRIMARY_NAV = [
  { href: "/admin",                  label: "Today",       roles: ["admin"] },
  { href: "/admin/calendar",         label: "Calendar",    roles: ["admin", "concierge"] },
  { href: "/admin/ops",              label: "Ops",         roles: ["admin", "ops"] },
  { href: "/admin/ops",              label: "Cleaning",    roles: ["housekeeping"] },
  { href: "/admin/ops/maintenance",  label: "Maintenance", roles: ["maintenance"] },
  { href: "/admin/services",         label: "Services",    roles: ["admin"] },
  { href: "/admin/requests",         label: "Requests",    roles: ["admin", "concierge"] },
];

const NAV_ICON: Record<string, typeof Menu> = {
  Today: LayoutDashboard, Calendar: CalendarDays, Ops: ClipboardList, Cleaning: Sparkles, Maintenance: Wrench, Services: ConciergeBell, Requests: MessageCircle,
};

const SECONDARY_NAV = [
  { href: "/admin/bookings",    label: "Bookings",   roles: ["admin", "concierge"] },
  { href: "/admin/properties",  label: "Properties", roles: ["admin"] },
  { href: "/admin/team",        label: "Team",        roles: ["admin"] },
  { href: "/admin/voice",       label: "Voice",       roles: ["admin"] },
];

interface Props {
  role: "admin" | "ops" | "housekeeping" | "maintenance" | "concierge";
  name: string;
}

export function AdminHeader({ role, name }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [moreOpen,    setMoreOpen]    = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [liveBadge,   setLiveBadge]  = useState(0);
  const moreRef    = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);

  // Receive badge count from LiveFeedPanel
  useEffect(() => {
    function onCount(e: Event) {
      setLiveBadge((e as CustomEvent<number>).detail);
    }
    window.addEventListener("live-feed-count", onCount);
    return () => window.removeEventListener("live-feed-count", onCount);
  }, []);

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
    color: active ? "#FFFFFF" : "var(--jood-ink-muted)",
    backgroundColor: active ? "var(--jood-ink)" : "transparent",
    textDecoration: "none",
    fontSize: "0.84rem",
    fontWeight: 600,
    padding: "7px 14px",
    borderRadius: "999px",
    transition: "background-color 150ms, color 150ms",
    whiteSpace: "nowrap",
  });

  return (
    <>
    <header
      className="jood-header-glass admin-bar"
      style={{
        padding: "0 16px",
        height: "64px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        position: "sticky",
        top: 0,
        zIndex: menuOpen ? 70 : 40,
      }}
    >
      {/* Laptop: the logo. Phone: the greeting, as in the reference */}
      <a className="admin-logo-desktop" href={ROLE_HOME[role] ?? "/admin"} style={{ flexShrink: 0, lineHeight: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="jood-logo" src="/jood-logo-dark.png" alt="JOOD" style={{ height: "22px", width: "auto", display: "block" }} />
      </a>
      <button type="button" className="app-greet admin-greet-mobile" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={menuOpen}
        style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "start", font: "inherit" }}>
        <span className="app-avatar" aria-hidden>{initials}</span>
        <span style={{ minWidth: 0 }}>
          <b>Hello, {name || "team"}</b>
          <small style={{ textTransform: "capitalize" }}>{role}</small>
        </span>
      </button>
      <div className="admin-logo-desktop" style={{ width: "1px", height: "20px", backgroundColor: "var(--jood-line)", flexShrink: 0, margin: "0 4px" }} />

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
              {moreOpen ? <ChevronUp size={11} strokeWidth={2} style={{ opacity: 0.6 }} /> : <ChevronDown size={11} strokeWidth={2} style={{ opacity: 0.6 }} />}
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

      {/* Right side: live feed + presence + profile avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        {/* Live feed trigger */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("live-feed-toggle"))}
          aria-label="Activity feed"
          style={{
            position: "relative",
            width: "32px", height: "32px", borderRadius: "50%",
            border: "1px solid var(--jood-line)",
            background: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--jood-ink-muted)", fontSize: "0.9rem",
            transition: "border-color 150ms, color 150ms",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--jood-ink)";
            e.currentTarget.style.color = "var(--jood-ink)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--jood-line)";
            e.currentTarget.style.color = "var(--jood-ink-muted)";
          }}
        >
          <Activity size={14} strokeWidth={1.75} />
          {liveBadge > 0 && (
            <span style={{
              position: "absolute", top: "-2px", right: "-2px",
              width: "8px", height: "8px", borderRadius: "50%",
              backgroundColor: "var(--jood-accent)",
              border: "2px solid var(--jood-surface)",
            }} />
          )}
        </button>

        <PresenceAvatars myName={name} myRole={role} />

        {/* Hamburger — mobile only */}
        <div ref={menuRef} className="admin-hamburger" style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            className="admin-menu-btn"
            style={{
              display: "none",
              width: "36px", height: "36px",
              background: "none", border: "1px solid var(--jood-line)",
              borderRadius: "var(--radius-md)", cursor: "pointer",
              alignItems: "center", justifyContent: "center",
              color: "var(--jood-ink)",
            }}
          >
            <Menu size={16} strokeWidth={1.75} />
          </button>
          {menuOpen && (
            <>
            <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(42,23,21,.45)", border: 0, zIndex: 59, cursor: "default" }} />
            <div role="dialog" aria-label="Menu" className="admin-sheet" style={{
              position: "fixed", left: 0, right: 0, bottom: 0,
              backgroundColor: "#FFFFFF", borderRadius: "28px 28px 0 0",
              boxShadow: "0 -10px 40px rgba(53,30,28,0.18)",
              maxWidth: "560px", margin: "0 auto", zIndex: 60, overflow: "hidden",
              padding: "10px 6px calc(16px + env(safe-area-inset-bottom, 0px))",
            }}>
              <div aria-hidden style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(53,30,28,.18)", margin: "0 auto 8px" }} />
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
                <p style={{ fontSize: "0.7rem", color: "var(--jood-ink-subtle)", marginTop: "2px", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{role}</p>
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
            </>
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
              fontSize: "0.6875rem", letterSpacing: "0.06em", color: "white",
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
                <p style={{ fontSize: "0.75rem", color: "var(--jood-ink-subtle)", marginTop: "2px", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{role}</p>
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
          .app-pill-nav               { display: none !important; }
          .admin-greet-mobile         { display: none !important; }
          .admin-nav-desktop          { display: flex !important; }
          .admin-nav-mobile-spacer    { display: none !important; }
          .admin-hamburger            { display: none !important; }
          .admin-profile-desktop      { display: block !important; }
        }
        @media (max-width: 639px) {
          .admin-logo-desktop         { display: none !important; }
          .admin-bar                  { padding-top: env(safe-area-inset-top, 0px); }
          .admin-nav-desktop          { display: none !important; }
          .admin-nav-mobile-spacer    { display: block !important; }
          .admin-hamburger            { display: block !important; }
          .admin-profile-desktop      { display: none !important; }
        }
      `}</style>
    </header>
    {/* Phone: the main desks as a floating pill, the open one is an ink pill with its name */}
    <nav className="app-pill-nav" aria-label="Main">
      {primaryVisible.map((item) => {
        const Icon = NAV_ICON[item.label] ?? LayoutDashboard;
        return (
          <a key={item.label} href={item.href} aria-label={item.label} aria-current={isActive(item.href) ? "page" : undefined}>
            <Icon size={18} strokeWidth={1.8} />
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
    </>
  );
}
