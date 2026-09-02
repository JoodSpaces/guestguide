"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function applyTheme(t: Theme) {
  const html = document.documentElement;
  if (t === "dark") html.setAttribute("data-theme", "dark");
  else if (t === "light") html.setAttribute("data-theme", "light");
  else html.removeAttribute("data-theme");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const stored = (localStorage.getItem("jood-theme") as Theme | null) ?? "system";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(stored);
      applyTheme(stored);
    } catch {}
  }, []);

  function toggle() {
    const next: Theme = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "light" : "dark")
      : theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try { localStorage.setItem("jood-theme", next); } catch {}
  }

  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: "30px",
        height: "30px",
        borderRadius: "50%",
        border: "1px solid var(--jood-line)",
        background: "transparent",
        color: "var(--jood-ink-muted)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "color 200ms, border-color 200ms",
      }}
    >
      {isDark ? (
        /* Sun */
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        /* Moon */
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      )}
    </button>
  );
}
