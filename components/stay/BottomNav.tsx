"use client";

import Link from "next/link";
import { useLocale } from "next-intl";

const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);
const IconCompass = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"/>
  </svg>
);
const IconSparkle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.09 6.26L21 10l-6.91 1.74L12 18l-2.09-6.26L3 10l6.91-1.74L12 2z"/>
  </svg>
);
const IconChat = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);

export type NavTab = "home" | "discover" | "services" | "help";

interface Props {
  token: string;
  active?: NavTab;
}

export function BottomNav({ token, active = "home" }: Props) {
  const locale = useLocale();
  const isRtl = locale === "ar";

  const tabs = [
    { id: "home" as NavTab,     href: `/s/${token}`,          icon: <IconHome />,    label: isRtl ? "الرئيسية" : "Home"     },
    { id: "discover" as NavTab, href: `/s/${token}/discover`,  icon: <IconCompass />, label: isRtl ? "اكتشف"    : "Discover"  },
    { id: "services" as NavTab, href: `/s/${token}/services`,  icon: <IconSparkle />, label: isRtl ? "الخدمات"  : "Services"  },
    { id: "help" as NavTab,     href: `/s/${token}/requests`,  icon: <IconChat />,    label: isRtl ? "تواصل"    : "Help"      },
  ];

  const ordered = isRtl ? [...tabs].reverse() : tabs;

  return (
    <nav
      aria-label={isRtl ? "التنقل الرئيسي" : "Main navigation"}
      className="jood-nav-glass"
      style={{
        position: "fixed",
        bottom: "clamp(16px, 4vw, 28px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: "2px",
        padding: "6px 8px",
        borderRadius: "40px",
        backdropFilter: "blur(32px) saturate(1.8)",
        WebkitBackdropFilter: "blur(32px) saturate(1.8)",
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
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
              padding: "8px 16px",
              borderRadius: "32px",
              textDecoration: "none",
              color: isActive ? "var(--jood-accent)" : "var(--jood-ink-faint)",
              backgroundColor: isActive ? "rgba(255, 96, 55, 0.09)" : "transparent",
              transition: "color 180ms ease, background-color 180ms ease, transform 100ms ease",
            }}
          >
            {tab.icon}
            <span style={{
              fontFamily: "var(--font-label)",
              fontSize: "9px",
              letterSpacing: "0.05em",
              fontWeight: isActive ? 600 : 400,
              whiteSpace: "nowrap",
            }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
