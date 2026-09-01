"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLocale } from "next-intl";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { BottomNav, type NavTab } from "@/components/stay/BottomNav";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { PushPrompt } from "@/components/stay/PushPrompt";

interface Props {
  token: string;
  title?: string;
  children: React.ReactNode;
  back?: boolean;
  activeTab?: NavTab;
}

export function StayShell({ token, title, children, back, activeTab = "home" }: Props) {
  const locale = useLocale();
  const isRtl = locale === "ar";

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

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
        className="jood-header-glass"
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
          <img src="/jood-logo-dark.png" alt="JOOD" className="jood-logo" style={{ height: "22px", width: "auto", display: "block" }} />
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>

      {/* Content */}
      <div className="pb-24" style={{ padding: "clamp(20px, 3vw, 36px) 24px 96px" }}>
        {children}
      </div>

      <PushPrompt token={token} />
      <BottomNav token={token} active={activeTab} />
    </main>
  );
}
