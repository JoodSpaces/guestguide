"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "jood-intent";

const INTENTS = [
  { id: "relax",   labelEn: "Relax",    labelAr: "استرخاء", icon: "✦" },
  { id: "explore", labelEn: "Explore",  labelAr: "اكتشاف",  icon: "◎" },
  { id: "work",    labelEn: "Work",     labelAr: "عمل",     icon: "⌘" },
  { id: "social",  labelEn: "Social",   labelAr: "تواصل",   icon: "◇" },
] as const;

type IntentId = typeof INTENTS[number]["id"];

interface IntentSelectorProps {
  isAr: boolean;
  onChange: (id: IntentId | null) => void;
}

export function IntentSelector({ isAr, onChange }: IntentSelectorProps) {
  const [active, setActive] = useState<IntentId | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && INTENTS.some((i) => i.id === saved)) {
        setActive(saved as IntentId);
        onChange(saved as IntentId);
      }
    } catch {}
    setMounted(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (id: IntentId) => {
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
    <div style={{ marginBottom: "28px" }}>
      <p style={{
        fontFamily: "var(--font-label)",
        fontSize: "9px",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--jood-ink-ghost)",
        marginBottom: "12px",
      }}>
        {isAr ? "ما مزاجك اليوم؟" : "What's your vibe today?"}
      </p>

      <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
        {INTENTS.map(({ id, labelEn, labelAr, icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => select(id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 16px",
                borderRadius: "var(--radius-pill)",
                border: isActive
                  ? "1px solid var(--jood-ink)"
                  : "1px solid var(--jood-line)",
                backgroundColor: isActive
                  ? "var(--jood-ink)"
                  : "transparent",
                color: isActive
                  ? "var(--jood-ground)"
                  : "var(--jood-ink-muted)",
                fontFamily: "var(--font-label)",
                fontSize: "0.6875rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 240ms var(--ease-spring)",
                WebkitTapHighlightColor: "transparent",
                outline: "none",
              }}
            >
              <span style={{
                fontSize: "11px",
                lineHeight: 1,
                opacity: isActive ? 1 : 0.7,
              }}>
                {icon}
              </span>
              {isAr ? labelAr : labelEn}
            </button>
          );
        })}
      </div>
    </div>
  );
}
