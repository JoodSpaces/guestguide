"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

interface Props {
  token: string;
}

export function PushPrompt({ token }: Props) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true); // start hidden

  useEffect(() => {
    // Only show if push is supported and not already subscribed
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "default") return;

    try {
      if (localStorage.getItem("jood_push_dismissed")) return;
    } catch {}

    const timer = setTimeout(() => {
      setDismissed(false);
      setTimeout(() => setVisible(true), 50); // trigger CSS transition
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  async function handleEnable() {
    setVisible(false);
    setTimeout(() => setDismissed(true), 300);

    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_KEY,
      });

      const json = sub.toJSON();
      await fetch("/api/stay/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        }),
      });
    } catch { /* user denied or browser error — silent */ }
  }

  function handleDismiss() {
    setVisible(false);
    setTimeout(() => setDismissed(true), 300);
    try { localStorage.setItem("jood_push_dismissed", "1"); } catch {}
  }

  if (dismissed) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "88px", // above BottomNav
        left: "16px",
        right: "16px",
        zIndex: 60,
        backgroundColor: "var(--jood-surface)",
        border: "1px solid var(--jood-line)",
        borderRadius: "var(--radius-lg)",
        padding: "16px 18px",
        boxShadow: "0 8px 32px rgba(53,30,28,0.14)",
        backdropFilter: "blur(16px) saturate(1.4)",
        WebkitBackdropFilter: "blur(16px) saturate(1.4)",
        display: "flex",
        gap: "14px",
        alignItems: "flex-start",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 280ms ease, transform 280ms ease",
        direction: isAr ? "rtl" : "ltr",
      }}
    >
      <div style={{ fontSize: "1.5rem", flexShrink: 0, lineHeight: 1.2 }}>🛎️</div>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 500, fontSize: "0.9rem", color: "var(--jood-ink)", marginBottom: "4px" }}>
          {isAr ? "ابق على اطلاع" : "Stay in the loop"}
        </p>
        <p style={{ fontSize: "0.8rem", color: "var(--jood-ink-muted)", lineHeight: 1.5, marginBottom: "12px" }}>
          {isAr ? "أرسل لك إشعاراً عندما نرد على طلبك" : "We'll notify you the moment we reply to your request"}
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleEnable}
            style={{
              padding: "8px 16px",
              backgroundColor: "var(--jood-ink)",
              color: "var(--jood-ground)",
              border: "none",
              borderRadius: "var(--radius-pill)",
              fontSize: "0.8125rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {isAr ? "تفعيل" : "Enable"}
          </button>
          <button
            onClick={handleDismiss}
            style={{
              padding: "8px 14px",
              backgroundColor: "transparent",
              color: "var(--jood-ink-muted)",
              border: "1px solid var(--jood-line)",
              borderRadius: "var(--radius-pill)",
              fontSize: "0.8125rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {isAr ? "لا، شكراً" : "Not now"}
          </button>
        </div>
      </div>
    </div>
  );
}
