"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { startTransition } from "react";

export function LanguageToggle() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale() {
    const next = locale === "en" ? "ar" : "en";
    document.cookie = `jood_locale=${next};path=/;max-age=31536000;samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      onClick={switchLocale}
      style={{
        fontFamily: locale === "en" ? "var(--font-arabic)" : "var(--font-body)",
        fontSize: "0.8125rem",
        color: "var(--jood-ink-muted)",
        background: "none",
        border: "1px solid var(--jood-line)",
        borderRadius: "var(--radius-pill)",
        padding: "5px 12px",
        cursor: "pointer",
        transition: `color var(--duration-fast) var(--ease-standard)`,
        letterSpacing: locale === "en" ? "0" : "0.02em",
      }}
      className="hover:text-[var(--jood-ink)]"
    >
      {t("language")}
    </button>
  );
}
