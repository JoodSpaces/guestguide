"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { QuickHelpFab } from "@/components/stay/QuickHelpFab";
import { ScrollProgress } from "@/components/ui/ScrollProgress";

interface Props {
  token: string;
  title?: string;
  children: React.ReactNode;
  back?: boolean;
}

export function StayShell({ token, title, children, back }: Props) {
  const locale = useLocale();
  const isRtl = locale === "ar";

  return (
    <main className="min-h-dvh" style={{ backgroundColor: "var(--jood-ground)" }}>
      <ScrollProgress />
      {/* Page frame */}
      <div
        className="fixed pointer-events-none z-50"
        style={{
          inset: "var(--frame-inset)",
          border: "1px solid var(--jood-line)",
          borderRadius: "var(--radius-lg)",
        }}
      />

      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: "56px",
          borderBottom: "1px solid var(--jood-line)",
          position: "sticky",
          top: 0,
          zIndex: 40,
          backgroundColor: "rgba(245, 244, 237, 0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {back && (
            <Link
              href={`/s/${token}`}
              aria-label={isRtl ? "رجوع" : "Back"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "1px solid var(--jood-line)",
                color: "var(--jood-ink)",
                textDecoration: "none",
                fontSize: "0.875rem",
                flexShrink: 0,
                transform: isRtl ? "scaleX(-1)" : "none",
              }}
            >
              ←
            </Link>
          )}
          {/* JOOD logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/jood-logo-dark.png" alt="JOOD" style={{ height: "22px", width: "auto", display: "block" }} />
          {title && (
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--jood-ink-muted)",
              }}
            >
              {title}
            </p>
          )}
        </div>
        <LanguageToggle />
      </header>

      {/* Content */}
      <div className="pb-24" style={{ padding: "clamp(20px, 3vw, 36px) 24px 96px" }}>
        {children}
      </div>

      <QuickHelpFab />
    </main>
  );
}
