"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  properties: { id: string; name: string }[];
  teamMembers: { id: string; name: string; role: string }[];
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--jood-ground)",
  color: "var(--jood-ink)",
  fontSize: "0.9375rem",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

export function CreateTurnoverForm({ properties, teamMembers }: Props) {
  const router = useRouter();
  const [open, setOpen]         = useState(false);
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [assignTo, setAssignTo] = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = "create-turnover-title";

  useEffect(() => {
    if (!open) return;
    // Trap Escape to close
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    // Focus first focusable element in modal
    const el = dialogRef.current?.querySelector<HTMLElement>("select,button,input");
    el?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleCreate() {
    if (!propertyId) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/ops/turnover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId,
        assignedTo: assignTo || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/admin/ops/turnover/${id}`);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "9px 18px",
          backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)",
          border: "none", borderRadius: "var(--radius-pill)",
          fontSize: "0.875rem", cursor: "pointer", fontFamily: "inherit",
        }}
      >
        + New turnover
      </button>
    );
  }

  return (
    <div
      role="presentation"
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          backgroundColor: "var(--jood-surface)",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
          width: "100%", maxWidth: "400px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <p id={titleId} style={{ fontSize: "1rem", fontWeight: 600, color: "var(--jood-ink)" }}>Create turnover task</p>
          <button aria-label="Close" onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem", color: "var(--jood-ink-ghost)", padding: "4px" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginBottom: "6px" }}>Which property?</label>
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} style={inputStyle}>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginBottom: "6px" }}>
              Assign to <span style={{ color: "var(--jood-ink-ghost)" }}>(optional)</span>
            </label>
            {teamMembers.length > 0 ? (
              <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} style={inputStyle}>
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            ) : (
              <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-ghost)" }}>
                No team members yet.{" "}
                <Link href="/admin/team" style={{ color: "var(--jood-accent)" }}>Add staff →</Link>
              </p>
            )}
          </div>

          {error && <p style={{ fontSize: "0.875rem", color: "var(--jood-danger)" }}>{error}</p>}

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button
              onClick={handleCreate}
              disabled={saving || !propertyId}
              style={{
                flex: 1, padding: "12px 20px",
                backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)",
                border: "none", borderRadius: "var(--radius-pill)",
                fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer",
                opacity: saving ? 0.5 : 1, fontFamily: "inherit",
              }}
            >
              {saving ? "Creating…" : "Create & open"}
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{
                padding: "12px 16px",
                background: "none", border: "1px solid var(--jood-line)",
                borderRadius: "var(--radius-pill)",
                fontSize: "0.9375rem", cursor: "pointer",
                color: "var(--jood-ink-muted)", fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
