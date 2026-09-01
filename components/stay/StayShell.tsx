"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [showBell, setShowBell] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if ("PushManager" in window && Notification.permission === "default") {
      setShowBell(true);
    }
  }, []);

  async function handleBellSubscribe() {
    setSubscribing(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setSubscribing(false); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_KEY,
      });
      const json = sub.toJSON();
      await fetch("/api/stay/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, endpoint: json.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" }),
      });
      try { localStorage.removeItem("jood_push_dismissed"); } catch {}
      setShowBell(false);
    } catch { /* denied or unsupported */ }
    setSubscribing(false);
  }

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
          {showBell && (
            <button
              onClick={handleBellSubscribe}
              disabled={subscribing}
              aria-label={isRtl ? "تفعيل الإشعارات" : "Enable notifications"}
              style={{
                position: "relative",
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "32px", height: "32px",
                borderRadius: "50%",
                border: "1px solid var(--jood-line)",
                backgroundColor: "transparent",
                cursor: "pointer",
                fontSize: "0.95rem",
                opacity: subscribing ? 0.5 : 1,
              }}
            >
              🔔
              <span style={{
                position: "absolute", top: "4px", right: "4px",
                width: "6px", height: "6px", borderRadius: "50%",
                backgroundColor: "var(--jood-accent)",
              }} />
            </button>
          )}
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
