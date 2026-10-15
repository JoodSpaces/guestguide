"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import Link from "next/link";
import { DetailHead, DetailsPanel, IdRow, State, StepLine } from "@/components/app/ui";
import { toast } from "@/components/admin/Toaster";
import { TeamPicker } from "@/components/admin/TeamPicker";

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  photo_urls: string[];
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  properties: { id: string; name: string } | { id: string; name: string }[];
}

interface Props { ticket: Ticket; team?: string[] }

const STATUS_COLOR: Record<string, string> = {
  open: "var(--jood-accent)",
  in_progress: "var(--jood-accent)",
  resolved: "var(--jood-success)",
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "var(--jood-danger)",
  normal: "var(--jood-ink-muted)",
  low: "var(--jood-ink-subtle)",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "Africa/Cairo", day: "numeric", month: "short", year: "numeric" });
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--jood-ground)",
  color: "var(--jood-ink)",
  fontSize: "0.875rem",
  boxSizing: "border-box",
};

const card: React.CSSProperties = {
  backgroundColor: "var(--jood-surface)",
  border: "none",
  borderRadius: "var(--radius-lg)",
  padding: "16px 20px",
  marginBottom: "12px",
};

export function MaintenanceDetailClient({ ticket: initial, team = [] }: Props) {
  const [ticket, setTicket] = useState(initial);
  const [assignedTo, setAssignedTo] = useState(initial.assigned_to ?? "");
  const [resolutionNotes, setResolutionNotes] = useState(initial.resolution_notes ?? "");
  const [resolvedBy, setResolvedBy] = useState(initial.resolved_by ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>(initial.photo_urls ?? []);
  const fileRef = useRef<HTMLInputElement>(null);

  const property = Array.isArray(ticket.properties) ? ticket.properties[0] : ticket.properties;

  async function patch(updates: Record<string, unknown>) {
    setSaving(true);
    const res = await fetch(`/api/admin/ops/maintenance/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).catch(() => null);
    setSaving(false);
    if (res?.ok) {
      setTicket((t) => ({ ...t, ...updates }));
      toast(updates.status === "resolved" ? "Ticket resolved" : "Saved");
    } else {
      toast("Could not save. Nothing was changed. Try again.", "error");
    }
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/ops/upload", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) { alert("Upload failed"); return; }
    const { url } = await res.json();
    const newPhotos = [...photos, url];
    setPhotos(newPhotos);
    await patch({ photo_urls: newPhotos });
  }

  return (
    <div style={{ maxWidth: "640px" }}>
      <DetailHead back="/admin/ops/maintenance" title="Ticket" />

      <IdRow
        label={`${property?.name ?? "House"} · ${fmt(ticket.created_at)}`}
        id={ticket.title}
        state={<span style={{ display: "inline-flex", gap: "6px" }}>
          {ticket.priority === "urgent" && ticket.status !== "resolved" && <State tone="danger">Urgent</State>}
          <State tone={ticket.status === "resolved" ? "ok" : ticket.status === "in_progress" ? "info" : "warn"}>{ticket.status.replace("_", " ")}</State>
        </span>}
      />

      <StepLine
        at={ticket.status === "resolved" ? 2 : ticket.status === "in_progress" ? 1 : 0}
        steps={[{ label: "Opened", sub: fmt(ticket.created_at) }, { label: "In progress" }, { label: "Resolved" }]}
      />

      <DetailsPanel
        title="Ticket details"
        rows={[
          { label: "House", value: property?.name ?? "—" },
          { label: "Category", value: ticket.category },
          { label: "Priority", value: ticket.priority },
          { label: "Opened", value: fmt(ticket.created_at) },
        ]}
      />
      {ticket.description && (
        <div className="app-details" style={{ marginTop: "10px" }}>
          <dl><div style={{ display: "block" }}><dd style={{ textAlign: "start", fontWeight: 500, lineHeight: 1.6, whiteSpace: "pre-line" }}>{ticket.description}</dd></div></dl>
        </div>
      )}
      <div style={{ height: "14px" }} />

      {/* Photos */}
      <div style={card}>
        <p style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "10px" }}>Photos</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {photos.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              <Image src={url} alt="" width={72} height={72} style={{ objectFit: "cover", borderRadius: "8px", border: "1px solid var(--jood-line)" }} />
            </a>
          ))}
          <input type="file" accept="image/*" capture="environment" ref={fileRef} style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
          {photos.length < 10 && (
            <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ width: "72px", height: "72px", borderRadius: "8px", border: "2px dashed var(--jood-line)", background: "none", cursor: "pointer", fontSize: "24px", color: "var(--jood-ink-muted)" }}>
              {uploading ? "⏳" : "+"}
            </button>
          )}
        </div>
      </div>

      {/* Status */}
      <div style={card}>
        <p style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "12px" }}>Status</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {(["open", "in_progress", "resolved"] as const).map((s) => (
            <button
              key={s}
              disabled={saving}
              onClick={() => patch({ status: s })}
              style={{
                padding: "7px 16px",
                borderRadius: "var(--radius-pill)",
                border: "none",
                backgroundColor: ticket.status === s ? "var(--jood-ink)" : "#FFFFFF",
                color: ticket.status === s ? "#FFFFFF" : "var(--jood-ink-muted)",
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Assign */}
      <div style={card}>
        <p style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "10px" }}>Assigned to</p>
        <div style={{ display: "flex", gap: "8px" }}>
          <TeamPicker value={assignedTo} onChange={setAssignedTo} team={team} style={{ ...inputStyle, flex: 1 }} />
          <button onClick={() => patch({ assigned_to: assignedTo || null })} disabled={saving} style={{ padding: "9px 16px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.8125rem", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
            Save
          </button>
        </div>
      </div>

      {/* Resolution */}
      {ticket.status === "resolved" ? (
        <div style={{ ...card, borderColor: "var(--jood-success)" }}>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-success)", marginBottom: "6px" }}>Resolved</p>
          {ticket.resolved_by && <p style={{ fontSize: "0.875rem", color: "var(--jood-ink)" }}>By {ticket.resolved_by}</p>}
          {ticket.resolved_at && <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>{fmt(ticket.resolved_at)}</p>}
          {ticket.resolution_notes && <p style={{ marginTop: "8px", fontSize: "0.9375rem", color: "var(--jood-ink)", lineHeight: 1.6 }}>{ticket.resolution_notes}</p>}
        </div>
      ) : (
        <div style={card}>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "10px" }}>Resolution</p>
          <input value={resolvedBy} onChange={(e) => setResolvedBy(e.target.value)} placeholder="Resolved by" style={{ ...inputStyle, marginBottom: "8px" }} />
          <textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="What was done?" style={{ ...inputStyle, resize: "vertical", minHeight: "70px", marginBottom: "10px" }} />
          <button
            onClick={() => patch({ status: "resolved", resolution_notes: resolutionNotes || null, resolved_by: resolvedBy || null })}
            disabled={saving}
            style={{ padding: "9px 20px", backgroundColor: "var(--jood-success)", color: "white", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: "pointer", opacity: saving ? 0.5 : 1 }}
          >
            Mark resolved ✓
          </button>
        </div>
      )}
    </div>
  );
}
