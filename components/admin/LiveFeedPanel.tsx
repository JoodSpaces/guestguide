"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Bell, MessageSquare, Wrench, UserCheck,
  LogOut, LogIn, Package, X, type LucideIcon,
} from "lucide-react";
import type { ActivityEvent } from "@/app/api/admin/activity/route";

// AdminHeader fires:  new CustomEvent("live-feed-toggle")
// LiveFeedPanel fires: new CustomEvent("live-feed-count", { detail: n })

const TYPE_ICON: Record<string, LucideIcon> = {
  service_request: Bell,
  guest_request:   MessageSquare,
  maintenance:     Wrench,
  guest_arrived:   UserCheck,
  checkout:        LogOut,
  arrival:         LogIn,
  inventory_alert: Package,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function LiveFeedPanel() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const prevIds = useRef<Set<string>>(new Set());

  const fetchEvents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/activity");
      if (!res.ok) return;
      const data: ActivityEvent[] = await res.json();
      setEvents(data);
      if (prevIds.current.size > 0) {
        const fresh = data.filter((e) => !prevIds.current.has(e.id)).length;
        if (fresh > 0 && !open) setNewCount((n) => n + fresh);
      }
      prevIds.current = new Set(data.map((e) => e.id));
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => {
    const id = setInterval(() => fetchEvents(true), 15_000);
    return () => clearInterval(id);
  }, [fetchEvents]);

  // Listen for toggle events fired by AdminHeader
  useEffect(() => {
    function onToggle() { setOpen((o) => !o); }
    window.addEventListener("live-feed-toggle", onToggle);
    return () => window.removeEventListener("live-feed-toggle", onToggle);
  }, []);

  // Broadcast badge count to AdminHeader whenever it changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("live-feed-count", { detail: newCount }));
  }, [newCount]);

  function handleItemClick() {
    setNewCount(0);
  }

  return (
    <>
      {/* Backdrop — tap to dismiss on mobile */}
      {open && (
        <div
          onClick={() => window.dispatchEvent(new CustomEvent("live-feed-toggle"))}
          style={{
            position: "fixed", inset: 0,
            zIndex: 48,
            backgroundColor: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(312px, 100vw)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 350ms cubic-bezier(0.4,0,0.2,1)",
          zIndex: 49,
          backgroundColor: "#0f0e0b",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          boxShadow: open ? "-8px 0 40px rgba(0,0,0,0.3)" : "none",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%",
              backgroundColor: "#4ade80",
              boxShadow: "0 0 6px #4ade80",
              display: "inline-block",
              animation: "pulse-green 2s infinite",
            }} />
            <span style={{ color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-label)", fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase" }}>
              Activity
            </span>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.7rem", fontFamily: "var(--font-mono)" }}>
              {loading ? "…" : `${events.length}`}
            </span>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("live-feed-toggle"))}
            aria-label="Close activity feed"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.4)", fontSize: "1.2rem",
              lineHeight: 1, padding: "4px 8px", borderRadius: "4px",
              transition: "color 150ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Feed */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {events.length === 0 && !loading && (
            <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px 20px", fontSize: "0.875rem" }}>
              No recent activity
            </p>
          )}
          {events.map((e, i) => (
            <a
              key={e.id}
              href={e.href ?? "#"}
              onClick={(ev) => { handleItemClick(); if (!e.href) ev.preventDefault(); }}
              style={{
                display: "block",
                padding: "12px 20px",
                textDecoration: "none",
                borderBottom: i < events.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                transition: "background 150ms",
              }}
              onMouseEnter={(el) => (el.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              onMouseLeave={(el) => (el.currentTarget.style.background = "transparent")}
            >
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0, marginTop: "1px", color: "rgba(255,255,255,0.45)", display: "flex" }}>
                  {(() => { const Icon = TYPE_ICON[e.type]; return Icon ? <Icon size={14} strokeWidth={1.75} /> : <Bell size={14} strokeWidth={1.75} />; })()}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <p style={{
                      color: "rgba(255,255,255,0.9)",
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      lineHeight: 1.4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {e.title}
                    </p>
                    <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.7rem", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                      {timeAgo(e.timestamp)}
                    </span>
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.subtitle}
                  </p>
                  {e.urgency === "urgent" && (
                    <span style={{ display: "inline-block", marginTop: "4px", color: "#f87171", fontSize: "0.6rem", fontFamily: "var(--font-label)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                      ● Urgent
                    </span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.65rem", fontFamily: "var(--font-mono)" }}>
            Refreshes every 15s
          </p>
          {lastUpdated && (
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.65rem", fontFamily: "var(--font-mono)" }}>
              {lastUpdated.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse-green {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </>
  );
}
