"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { BottomNav } from "@/components/stay/BottomNav";
import { PushPrompt } from "@/components/stay/PushPrompt";
import type { ReactNode } from "react";

interface StayShellProps {
  token: string;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  back?: boolean;
  activeTab?: "home" | "discover" | "services" | "help";
}

const PUSH_KEY = "BLj7itobprKLwVWBzI0oBqK0VSnzN-16naPiHeS45dKH_NJ4NUWTVMF9aBv5mDBA20SsTaG0TFne8FzzovBcKC4";

export function StayShell({ token, title, eyebrow, children, back, activeTab = "home" }: StayShellProps) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const [showBell, setShowBell] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if ("PushManager" in window) {
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
        applicationServerKey: PUSH_KEY,
      });
      const json = sub.toJSON();
      await fetch("/api/stay/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, endpoint: json.endpoint, keys: json.keys }),
      });
    } catch {}
    setShowBell(false);
    setSubscribing(false);
  }

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "var(--jood-ground)" }}>

      {/* ── Sticky header — minimal ────────────────────────────────────────── */}
      <header
        className="jood-header-glass"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 22px",
          height: "54px",
          borderBottom: "1px solid var(--jood-line)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {back && (
            <Link
              href={`/s/${token}`}
              aria-label={isRtl ? "رجوع" : "Back"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "28px", height: "28px",
                borderRadius: "50%",
                border: "1px solid var(--jood-line)",
                color: "var(--jood-ink)",
                textDecoration: "none",
                fontSize: "0.8125rem",
                flexShrink: 0,
                transform: isRtl ? "scaleX(-1)" : "none",
              }}
            >
              ←
            </Link>
          )}
          <img
            src="/jood-logo-dark.png"
            alt="JOOD"
            className="jood-logo"
            style={{ height: "22px", width: "auto", display: "block" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {showBell && (
            <button
              onClick={handleBellSubscribe}
              disabled={subscribing}
              aria-label={isRtl ? "تفعيل الإشعارات" : "Enable notifications"}
              style={{
                position: "relative",
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "30px", height: "30px",
                borderRadius: "50%",
                border: "1px solid var(--jood-line)",
                backgroundColor: "transparent",
                cursor: "pointer",
                fontSize: "0.875rem",
                opacity: subscribing ? 0.5 : 1,
              }}
            >
              🔔
              <span aria-hidden style={{
                position: "absolute", top: "4px", right: "4px",
                width: "5px", height: "5px", borderRadius: "50%",
                backgroundColor: "var(--jood-garnet)",
              }} />
            </button>
          )}
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>

      {/* ── Editorial page title ───────────────────────────────────────────── */}
      {title && (
        <div style={{
          padding: "22px 22px 20px",
          borderBottom: "1px solid var(--jood-line)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}>
          <div>
            {eyebrow && (
              <p style={{
                fontFamily: "var(--font-label)",
                fontSize: "8.5px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--jood-ink-faint)",
                marginBottom: "6px",
              }}>
                {eyebrow}
              </p>
            )}
            <h1 style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.4rem, 9vw, 3rem)",
              fontWeight: 300,
              fontStyle: "italic",
              color: "var(--jood-ink)",
              lineHeight: 1,
            }}>
              {title}
            </h1>
          </div>
        </div>
      )}

      {/* ── Page content ──────────────────────────────────────────────────── */}
      <div style={{ padding: "clamp(20px, 3vw, 32px) 22px 88px" }}>
        {children}
      </div>

      <PushPrompt token={token} />
      <BottomNav token={token} active={activeTab} />
    </div>
  );
}
