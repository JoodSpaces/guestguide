"use client";

import { useTranslations, useLocale } from "next-intl";

export function QuickHelpFab() {
  const t = useTranslations("arrival");
  const locale = useLocale();
  const isRtl = locale === "ar";

  return (
    <button
      aria-label={t("trouble")}
      style={{
        position: "fixed",
        bottom: "clamp(20px, 5vw, 32px)",
        [isRtl ? "left" : "right"]: "clamp(20px, 5vw, 32px)",
        width: "var(--radius-icon)",
        height: "var(--radius-icon)",
        borderRadius: "50%",
        backgroundColor: "var(--jood-ink)",
        color: "var(--jood-ground)",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.25rem",
        boxShadow: "var(--shadow-raised)",
        transition: `transform var(--duration-fast) var(--ease-standard)`,
        zIndex: 40,
      }}
      className="hover:scale-105 active:scale-95"
    >
      ?
    </button>
  );
}
