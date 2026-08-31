"use client";

import { useState, useEffect } from "react";

interface PresenceMember {
  name: string;
  role: string;
  last_seen_at: string;
}

const ROLE_HUE: Record<string, string> = {
  admin: "#8b6f47",
  ops: "var(--jood-aqua)",
  concierge: "var(--jood-warning)",
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function isActive(lastSeen: string) {
  return Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000;
}

interface Props {
  myName: string;
  myRole: string;
}

export function PresenceAvatars({ myName, myRole }: Props) {
  const [members, setMembers] = useState<PresenceMember[]>([]);

  async function announce() {
    if (!myName) return;
    await fetch("/api/admin/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: myName, role: myRole }),
    }).catch(() => {});
  }

  async function fetchPresence() {
    const res = await fetch("/api/admin/presence").catch(() => null);
    if (!res?.ok) return;
    const data: PresenceMember[] = await res.json();
    setMembers(data);
  }

  useEffect(() => {
    announce();
    fetchPresence();
    const id = setInterval(() => { announce(); fetchPresence(); }, 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myName]);

  if (members.length === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      {members.map((m) => {
        const active = isActive(m.last_seen_at);
        return (
          <div
            key={m.name}
            title={`${m.name} (${m.role})${active ? " · active" : ""}`}
            style={{
              position: "relative",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: "var(--jood-surface-raised)",
              border: `1.5px solid ${active ? "#4ade80" : "var(--jood-line)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.6rem",
              fontFamily: "var(--font-label)",
              letterSpacing: "0.04em",
              color: "var(--jood-ink)",
              cursor: "default",
              transition: "border-color 300ms",
            }}
          >
            {initials(m.name)}
            {active && (
              <span style={{
                position: "absolute",
                bottom: "-1px",
                right: "-1px",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: "#4ade80",
                border: "1.5px solid var(--jood-ground)",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
