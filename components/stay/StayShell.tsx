"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { PushPrompt } from "@/components/stay/PushPrompt";
import type { ReactNode } from "react";
import { AppIcon } from "@/components/ui/AppIcon";

interface StayShellProps {
  token: string;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  back?: boolean;
  activeTab?: "home" | "discover" | "services" | "concierge" | "help" | "none";
}

const PUSH_KEY = "BLj7itobprKLwVWBzI0oBqK0VSnzN-16naPiHeS45dKH_NJ4NUWTVMF9aBv5mDBA20SsTaG0TFne8FzzovBcKC4";

export function StayShell({ token, title, eyebrow, children, back, activeTab = "none" }: StayShellProps) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const [showBell, setShowBell] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    try { localStorage.setItem("jood_stay_token", token); } catch {}
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
        body: JSON.stringify({ token, endpoint: json.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" }),
      });
    } catch {}
    setShowBell(false);
    setSubscribing(false);
  }

  // Every inner screen has its own glow, so a screen is recognisable by its colour.
  const PALETTE: [string, string][] = [["#2FD6A0", "#0B5C57"], ["#6C7BFF", "#2A1B6B"], ["#FF9A3D", "#7A2E10"], ["#FF5FA8", "#5E1B45"], ["#A0C9CB", "#1E4B4F"]];
  const byTab: Record<string, number> = { discover: 0, concierge: 1, help: 2, services: 3 };
  const hash = Array.from(title ?? token).reduce((n, ch) => n + ch.charCodeAt(0), 0);
  const [a1, a2] = PALETTE[byTab[activeTab] ?? hash % PALETTE.length];

  return (
    <div className="stay-root aura" style={{ minHeight: "100dvh", position: "relative" }}>
      <div className="aura-bg" aria-hidden />

      {/* The header, only on inner screens: a round back button, the name in the middle, the small controls at the end */}
      <header className="aura-head" style={{ direction: isRtl ? "rtl" : "ltr" }}>
        {back ? (
          <Link href={`/s/${token}`} aria-label={isRtl ? "رجوع" : "Back"} className="aura-round" style={{ transform: isRtl ? "scaleX(-1)" : "none" }}>←</Link>
        ) : <span style={{ width: 42 }} />}
        <p className="aura-head-title">{title ?? eyebrow}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", minWidth: 42 }}>
          {showBell && (
            <button onClick={handleBellSubscribe} disabled={subscribing} aria-label={isRtl ? "تفعيل الإشعارات" : "Enable notifications"} className="aura-round" style={{ opacity: subscribing ? 0.5 : 1, cursor: "pointer" }}>
              <AppIcon name="bell" size={16} />
            </button>
          )}
          <LanguageToggle />
        </div>
      </header>

      {/* The page title on its own glowing sheet */}
      {title && eyebrow && (
        <section className="aura-tile aura-title-sheet" style={{ "--a1": a1, "--a2": a2 } as React.CSSProperties}>
          <span className="aura-title-eyebrow">{eyebrow}</span>
          <h1 style={{ position: "relative", margin: 0 }}>{title}</h1>
        </section>
      )}

      <div style={{ padding: "16px 16px 56px", maxWidth: 560, margin: "0 auto", position: "relative" }}>
        {children}
      </div>

      <PushPrompt token={token} />
    </div>
  );
}
