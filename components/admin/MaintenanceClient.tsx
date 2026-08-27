"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Property { id: string; name: string; }

interface Props {
  properties: Property[];
  defaultPropertyId?: string;
}

const CATEGORIES = ["plumbing", "electrical", "ac", "appliance", "furniture", "pool", "structural", "general"];
const PRIORITIES = ["urgent", "normal", "low"];

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "var(--jood-danger)",
  normal: "var(--jood-ink-muted)",
  low: "var(--jood-ink-ghost)",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--jood-ground)",
  color: "var(--jood-ink)",
  fontSize: "0.875rem",
  boxSizing: "border-box",
};

export function MaintenanceClient({ properties, defaultPropertyId }: Props) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? properties[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [assignedTo, setAssignedTo] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadPhoto(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/ops/upload", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) { setError("Upload failed"); return; }
    const { url } = await res.json();
    setPhotos((p) => [...p, url]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !propertyId) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/ops/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, title: title.trim(), description: description || undefined, category, priority, assignedTo: assignedTo || undefined, photoUrls: photos }),
    });
    setSaving(false);
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/admin/ops/maintenance/${id}`);
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to create ticket");
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: "560px" }}>
      <a href="/admin/ops/maintenance" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--jood-ink-muted)", textDecoration: "none", fontSize: "0.8125rem", marginBottom: "20px" }}>
        ← Maintenance
      </a>
      <h1 className="font-display" style={{ fontSize: "1.8rem", marginBottom: "28px" }}>New ticket</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Property */}
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-label)" }}>Property</label>
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} style={input} required>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Title */}
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-label)" }}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={input} placeholder="e.g. AC not cooling in master bedroom" required />
        </div>

        {/* Category + Priority */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-label)" }}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...input, textTransform: "capitalize" }}>
              {CATEGORIES.map((c) => <option key={c} value={c} style={{ textTransform: "capitalize" }}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-label)" }}>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ ...input, color: PRIORITY_COLOR[priority] }}>
              {PRIORITIES.map((p) => <option key={p} value={p} style={{ textTransform: "capitalize" }}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-label)" }}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...input, resize: "vertical", minHeight: "80px" }} placeholder="Details about the issue..." />
        </div>

        {/* Assigned to */}
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-label)" }}>Assign to (optional)</label>
          <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} style={input} placeholder="Name or team" />
        </div>

        {/* Photos */}
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-label)" }}>Photos</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            {photos.map((url, i) => (
              <div key={i} style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--jood-line)" }} />
                <button type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} style={{ position: "absolute", top: "-6px", right: "-6px", width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "var(--jood-danger)", color: "white", border: "none", cursor: "pointer", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
            ))}
            <input type="file" accept="image/*" capture="environment" ref={fileRef} style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
            {photos.length < 10 && (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ width: "60px", height: "60px", borderRadius: "8px", border: "2px dashed var(--jood-line)", backgroundColor: "transparent", cursor: "pointer", fontSize: "20px", color: "var(--jood-ink-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {uploading ? "⏳" : "+"}
              </button>
            )}
          </div>
        </div>

        {error && <p style={{ color: "var(--jood-danger)", fontSize: "0.875rem" }}>{error}</p>}

        <button type="submit" disabled={saving || !title.trim()} style={{ padding: "12px 24px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.9375rem", cursor: "pointer", opacity: saving || !title.trim() ? 0.5 : 1 }}>
          {saving ? "Creating…" : "Create ticket"}
        </button>
      </div>
    </form>
  );
}
