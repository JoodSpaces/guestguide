"use client";

import Link from "next/link";
import { useLocale } from "next-intl";

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
  active?: "home" | "discover" | "services" | "help";
}

export function BottomNav({ token, active = "home" }: BottomNavProps) {
  const locale = useLocale();
  const isRtl = locale === "ar";

  const tabs = [
    { id: "home",     href: `/s/${token}`,           icon: <IconHome />,    label: isRtl ? "الرئيسية" : "Home" },
    { id: "discover", href: `/s/${token}/discover`,   icon: <IconCompass />, label: isRtl ? "اكتشف" : "Discover" },
    { id: "services", href: `/s/${token}/services`,   icon: <IconSparkle />, label: isRtl ? "الخدمات" : "Services" },
    { id: "help",     href: `/s/${token}/requests`,   icon: <IconChat />,    label: isRtl ? "تواصل" : "Help" },
  ] as const;

  const ordered = isRtl ? [...tabs].reverse() : tabs;

  return (
    <nav
      aria-label={isRtl ? "التنقل الرئيسي" : "Main navigation"}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "58px",
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
              color: isActive ? "var(--jood-ink)" : "var(--jood-ink-faint)",
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

            {isActive && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  bottom: "8px",
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
