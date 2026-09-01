"use client";

import { useEffect, useState } from "react";

export type Intent = "relax" | "explore" | "eat" | "work";

const STORAGE_KEY = "jood-intent";

const INTENTS: { id: Intent; labelEn: string; labelAr: string; icon: React.ReactNode }[] = [
  {
    id: "relax",
    labelEn: "Relax",
    labelAr: "استرخاء",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 18c1.4-1.4 3-2 5-2s3.6.6 5 2 3 2 5 2" />
        <path d="M2 14c1.4-1.4 3-2 5-2s3.6.6 5 2 3 2 5 2" />
        <circle cx="12" cy="7" r="3" />
      </svg>
    ),
  },
  {
    id: "explore",
    labelEn: "Explore",
    labelAr: "استكشف",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" />
      </svg>
    ),
  },
  {
    id: "eat",
    labelEn: "Eat",
    labelAr: "طعام",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
      </svg>
    ),
  },
  {
    id: "work",
    labelEn: "Work",
    labelAr: "عمل",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
];

interface Props {
  isAr: boolean;
  onChange: (intent: Intent | null) => void;
}

export function IntentSelector({ isAr, onChange }: Props) {
  const [active, setActive] = useState<Intent | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Intent | null;
      if (saved && INTENTS.some((i) => i.id === saved)) {
        setActive(saved);
        onChange(saved);
      }
    } catch {}
    setMounted(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (id: Intent) => {
    const next = active === id ? null : id;
    setActive(next);
    onChange(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, next);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  if (!mounted) return null;

  return (
    <div style={{ marginBottom: "24px" }}>
      <p style={{
        fontFamily: "var(--font-mono)",
        fontSize: "9px",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--jood-ink-ghost)",
        marginBottom: "10px",
      }}>
        {isAr ? "ما مزاجك اليوم؟" : "What's your vibe today?"}
      </p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {INTENTS.map(({ id, labelEn, labelAr, icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => select(id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "var(--radius-pill)",
                border: isActive
                  ? "1px solid var(--jood-accent)"
                  : "1px solid var(--jood-line)",
                backgroundColor: isActive
                  ? "var(--jood-accent)"
                  : "transparent",
                color: isActive ? "white" : "var(--jood-ink-muted)",
                fontFamily: "var(--font-label)",
                fontSize: "0.75rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 220ms cubic-bezier(0.16,1,0.3,1)",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {icon}
              {isAr ? labelAr : labelEn}
            </button>
          );
        })}
      </div>
    </div>
  );
}
