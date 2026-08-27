import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jood: {
          ground: "var(--jood-ground)",
          surface: "var(--jood-surface)",
          "surface-raised": "var(--jood-surface-raised)",
          ink: "var(--jood-ink)",
          "ink-muted": "var(--jood-ink-muted)",
          "ink-faint": "var(--jood-ink-faint)",
          "ink-ghost": "var(--jood-ink-ghost)",
          accent: "var(--jood-accent)",
          "accent-ink": "var(--jood-accent-ink)",
          line: "var(--jood-line)",
          success: "var(--jood-success)",
          warning: "var(--jood-warning)",
          danger: "var(--jood-danger)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        label: ["var(--font-label)", "system-ui", "sans-serif"],
        arabic: ["var(--font-arabic)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      transitionTimingFunction: {
        jood: "var(--ease-standard)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        reveal: "850ms",
        image: "1100ms",
      },
      borderRadius: {
        pill: "20px",
        icon: "38px",
      },
    },
  },
  plugins: [],
};

export default config;
