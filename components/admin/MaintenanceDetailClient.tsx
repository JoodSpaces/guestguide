"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import Link from "next/link";

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

interface Props { ticket: Ticket }

const STATUS_COLOR: Record<string, string> = {
  open: "var(--jood-accent)",
  in_progress: "var(--jood-accent)",
  resolved: "var(--jood-success)",
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "var(--jood-danger)",
  normal: "var(--jood-ink-muted)",
  low: "var(--jood-ink-ghost)",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-lg)",
  padding: "16px 20px",
  marginBottom: "12px",
};

export function MaintenanceDetailClient({ ticket: initial }: Props) {
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
    });
    setSaving(false);
    if (res.ok) setTicket((t) => ({ ...t, ...updates }));
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
      <Link href="/admin/ops/maintenance" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--jood-ink-muted)", textDecoration: "none", fontSize: "0.8125rem", marginBottom: "20px" }}>
        ← Maintenance
      </Link>

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: STATUS_COLOR[ticket.status], border: `1px solid ${STATUS_COLOR[ticket.status]}`, borderRadius: "var(--radius-pill)", padding: "3px 9px" }}>
            {ticket.status.replace("_", " ")}
          </span>
          <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: PRIORITY_COLOR[ticket.priority], border: `1px solid ${PRIORITY_COLOR[ticket.priority]}`, borderRadius: "var(--radius-pill)", padding: "3px 9px" }}>
            {ticket.priority}
          </span>
          <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--jood-ink-muted)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", padding: "3px 9px" }}>
            {ticket.category}
          </span>
        </div>
        <h1 className="font-display" style={{ fontSize: "1.6rem", marginBottom: "4px" }}>{ticket.title}</h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>{property?.name} · {fmt(ticket.created_at)}</p>
        {ticket.description && <p style={{ marginTop: "12px", fontSize: "0.9375rem", lineHeight: 1.6, color: "var(--jood-ink)" }}>{ticket.description}</p>}
      </div>

      {/* Photos */}
      <div style={card}>
        <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "10px" }}>Photos</p>
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
        <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "12px" }}>Status</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {(["open", "in_progress", "resolved"] as const).map((s) => (
            <button
              key={s}
              disabled={saving}
              onClick={() => patch({ status: s })}
              style={{
                padding: "7px 16px",
                borderRadius: "var(--radius-pill)",
                border: `1px solid ${ticket.status === s ? STATUS_COLOR[s] : "var(--jood-line)"}`,
                backgroundColor: "transparent",
                color: ticket.status === s ? STATUS_COLOR[s] : "var(--jood-ink-muted)",
                fontSize: "0.8125rem",
                cursor: "pointer",
                fontFamily: "var(--font-label)",
                letterSpacing: "0.06em",
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
        <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "10px" }}>Assigned to</p>
        <div style={{ display: "flex", gap: "8px" }}>
          <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Name or team" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={() => patch({ assigned_to: assignedTo || null })} disabled={saving} style={{ padding: "9px 16px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.8125rem", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
            Save
          </button>
        </div>
      </div>

      {/* Resolution */}
      {ticket.status === "resolved" ? (
        <div style={{ ...card, borderColor: "var(--jood-success)" }}>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-success)", marginBottom: "6px" }}>Resolved</p>
          {ticket.resolved_by && <p style={{ fontSize: "0.875rem", color: "var(--jood-ink)" }}>By {ticket.resolved_by}</p>}
          {ticket.resolved_at && <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>{fmt(ticket.resolved_at)}</p>}
          {ticket.resolution_notes && <p style={{ marginTop: "8px", fontSize: "0.9375rem", color: "var(--jood-ink)", lineHeight: 1.6 }}>{ticket.resolution_notes}</p>}
        </div>
      ) : (
        <div style={card}>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "10px" }}>Resolution</p>
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
