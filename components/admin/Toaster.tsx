"use client";

import { useEffect, useState } from "react";

interface ToastItem { id: number; message: string; type: "success" | "error"; }

let _id = 0;

export function toast(message: string, type: "success" | "error" = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("jood:toast", { detail: { message, type } }));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handler(e: Event) {
      const { message, type } = (e as CustomEvent).detail;
      const id = ++_id;
      setItems((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2500);
    }
    window.addEventListener("jood:toast", handler);
    return () => window.removeEventListener("jood:toast", handler);
  }, []);

  if (!items.length) return null;

  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px",
      display: "flex", flexDirection: "column", gap: "8px",
      zIndex: 200, pointerEvents: "none",
    }}>
      {items.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "10px 16px",
            backgroundColor: t.type === "error" ? "var(--jood-danger)" : "var(--jood-ink)",
            color: "var(--jood-ground)",
            borderRadius: "var(--radius-lg)",
            fontSize: "0.8125rem",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            animation: "toast-in 250ms cubic-bezier(0.16,1,0.3,1)",
            fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>{t.type === "error" ? "✕" : "✓"}</span>
          {t.message}
        </div>
      ))}
      <style>{`@keyframes toast-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }`}</style>
    </div>
  );
}
