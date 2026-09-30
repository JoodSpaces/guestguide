"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useUiMode } from "@/components/ui/UiMode";

const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9,22 9,12 15,12 15,22" />
  </svg>
);

const IconCompass = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" />
  </svg>
);

// Services: a concierge bell. (The sparkle is the conventional "AI" mark, so it belongs to the AI tab.)
const IconServices = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 20a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1Z" />
    <path d="M20 16a8 8 0 1 0-16 0" />
    <path d="M12 4v4M10 4h4" />
  </svg>
);

const IconSparkle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.09 6.26L21 10l-6.91 1.74L12 18l-2.09-6.26L3 10l6.91-1.74L12 2z" />
  </svg>
);

const IconChat = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

interface BottomNavProps {
  token: string;
  active?: "home" | "discover" | "services" | "concierge" | "help" | "none";
}

export function BottomNav({ token, active = "none" }: BottomNavProps) {
  const locale = useLocale();
  const isRtl = locale === "ar";

  const tabs = [
    { id: "home",      href: `/s/${token}`,             icon: <IconHome />,    label: isRtl ? "الرئيسية" : "Home" },
    { id: "discover",  href: `/s/${token}/discover`,     icon: <IconCompass />, label: isRtl ? "اكتشف" : "Discover" },
    { id: "services",  href: `/s/${token}/services`,     icon: <IconServices />, label: isRtl ? "الخدمات" : "Services" },
    { id: "concierge", href: `/s/${token}/concierge`,    icon: <IconSparkle />,      label: isRtl ? "مساعد" : "AI" },
    { id: "help",      href: `/s/${token}/requests`,     icon: <IconChat />,    label: isRtl ? "تواصل" : "Help" },
  ] as const;

  const ordered = isRtl ? [...tabs].reverse() : tabs;
  const ui = useUiMode();

  if (ui === "next") {
    // The new look: a floating glass pill, labels under every icon, and the concierge as a raised centre button.
    const by = Object.fromEntries(tabs.map((tb) => [tb.id, tb]));
    const seq = [by.home, by.discover, by.concierge, by.services, by.help];
    const pill = isRtl ? [...seq].reverse() : seq;
    return (
      <nav
        aria-label={isRtl ? "التنقل الرئيسي" : "Main navigation"}
        className="stay-pill-nav"
        style={{
          position: "fixed", left: 14, right: 14, bottom: "calc(14px + env(safe-area-inset-bottom, 0px))", zIndex: 50, maxWidth: 420, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 999,
          background: "linear-gradient(180deg, rgba(237,233,224,.11), rgba(237,233,224,.04))", border: "1px solid var(--jood-line)",
          backdropFilter: "blur(18px) saturate(130%)", WebkitBackdropFilter: "blur(18px) saturate(130%)",
          boxShadow: "inset 0 1px 0 rgba(237,233,224,.13), 0 14px 36px rgba(0,0,0,.45)",
        }}
      >
        {pill.map((tab) => {
          const isActive = tab.id === active;
          const centre = tab.id === "concierge";
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              style={centre ? {
                flex: "none", width: 62, height: 62, margin: "-18px 4px 0", borderRadius: "50%", display: "grid", placeItems: "center",
                background: "linear-gradient(135deg, #FF6037, #733635)", color: "#fff", textDecoration: "none",
                boxShadow: "0 10px 30px rgba(0,0,0,.55), 0 0 0 4px rgba(237,233,224,.06), 0 0 38px -6px #FF6037",
              } : {
                flex: 1, display: "grid", placeItems: "center", gap: 2, height: 52, borderRadius: 999, textDecoration: "none",
                color: isActive ? "var(--jood-ink)" : "var(--jood-ink-subtle)", fontSize: 11, letterSpacing: isRtl ? 0 : "0.04em",
              }}
            >
              <span style={{ display: "flex", color: isActive && !centre ? "#FF6037" : "inherit" }}>{centre ? <span style={{ transform: "scale(1.25)", display: "flex" }}>{tab.icon}</span> : tab.icon}</span>
              {!centre && <span>{tab.label}</span>}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label={isRtl ? "التنقل الرئيسي" : "Main navigation"}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "64px",
        display: "flex",
        alignItems: "center",
        backgroundColor: "var(--jood-ground)",
        borderTop: "1px solid var(--jood-line)",
        zIndex: 50,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {ordered.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              textDecoration: "none",
              color: isActive ? "var(--jood-ink)" : "var(--jood-ink-subtle)",
              position: "relative",
              WebkitTapHighlightColor: "transparent",
              transition: "color 200ms",
            }}
          >
            <span style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 220ms cubic-bezier(0.16,1,0.3,1)",
              transform: isActive ? "translateY(-1px)" : "translateY(0)",
            }}>
              {tab.icon}
            </span>
            <span style={{ fontSize: "11px", lineHeight: 1, marginTop: "3px", fontWeight: isActive ? 600 : 400, letterSpacing: isRtl ? 0 : "0.02em" }}>
              {tab.label}
            </span>

            {isActive && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  bottom: "3px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "3px",
                  height: "3px",
                  borderRadius: "50%",
                  backgroundColor: "var(--jood-garnet)",
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
