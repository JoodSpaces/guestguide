"use client";

import { useState } from "react";

export interface Property {
  id: string;
  slug: string;
  name: string;
  name_ar: string;
  city: string;
  address: string;
  bedrooms: number;
  max_guests: number;
  wifi_ssid: string | null;
}

interface Props {
  initialProperties: Property[];
}

const BLANK: Omit<Property, "id"> = {
  slug: "", name: "", name_ar: "", city: "", address: "",
  bedrooms: 1, max_guests: 2, wifi_ssid: "",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function PropertiesClient({ initialProperties }: Props) {
  const [properties, setProperties] = useState(initialProperties);
  const [editing, setEditing] = useState<Property | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Omit<Property, "id">>(BLANK);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setForm(BLANK);
    setAdding(true);
    setEditing(null);
    setError(null);
  }

  function openEdit(p: Property) {
    setForm({ slug: p.slug, name: p.name, name_ar: p.name_ar, city: p.city, address: p.address, bedrooms: p.bedrooms, max_guests: p.max_guests, wifi_ssid: p.wifi_ssid ?? "" });
    setEditing(p);
    setAdding(false);
    setError(null);
  }

  function close() {
    setAdding(false);
    setEditing(null);
    setError(null);
  }

  function field(key: keyof Omit<Property, "id">, value: string | number) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "name" && !editing) next.slug = slugify(String(value));
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, bedrooms: Number(form.bedrooms), max_guests: Number(form.max_guests) };
      if (editing) {
        const res = await fetch(`/api/admin/properties/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to save"); return; }
        const updated: Property = await res.json();
        setProperties((prev) => prev.map((p) => p.id === updated.id ? updated : p));
      } else {
        const res = await fetch("/api/admin/properties", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const d = await res.json(); setError(typeof d.error === "string" ? d.error : JSON.stringify(d.error)); return; }
        const created: Property = await res.json();
        setProperties((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      close();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this property? All bookings and data linked to it will also be deleted.")) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/properties/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) setProperties((prev) => prev.filter((p) => p.id !== id));
    else { const d = await res.json(); alert(d.error ?? "Failed to delete"); }
  }

  const showForm = adding || !!editing;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
        <h1 className="font-display" style={{ fontSize: "1.8rem" }}>Properties</h1>
        {!showForm && (
          <button onClick={openAdd} style={{ padding: "10px 20px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", borderRadius: "var(--radius-pill)", border: "none", fontSize: "0.875rem", cursor: "pointer", fontFamily: "inherit" }}>
            + Add property
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)", padding: "24px", marginBottom: "32px" }}>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "20px" }}>
            {editing ? "Edit property" : "New property"}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <FormField label="Name (English)" value={form.name} onChange={(v) => field("name", v)} />
            <FormField label="Name (Arabic)" value={form.name_ar} onChange={(v) => field("name_ar", v)} dir="rtl" />
            <FormField label="Slug (URL identifier)" value={form.slug} onChange={(v) => field("slug", v)} placeholder="villa-dunes" mono />
            <FormField label="City" value={form.city} onChange={(v) => field("city", v)} />
            <div style={{ gridColumn: "1 / -1" }}>
              <FormField label="Address" value={form.address} onChange={(v) => field("address", v)} />
            </div>
            <FormField label="Bedrooms" value={String(form.bedrooms)} onChange={(v) => field("bedrooms", Number(v))} type="number" />
            <FormField label="Max guests" value={String(form.max_guests)} onChange={(v) => field("max_guests", Number(v))} type="number" />
            <div style={{ gridColumn: "1 / -1" }}>
              <FormField label="Wi-Fi network name (optional)" value={form.wifi_ssid ?? ""} onChange={(v) => field("wifi_ssid", v)} placeholder="JOOD_Villa" />
            </div>
          </div>

          {error && (
            <p style={{ color: "var(--jood-danger)", fontSize: "0.8125rem", marginTop: "12px" }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button onClick={save} disabled={saving} style={{ padding: "10px 24px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", borderRadius: "var(--radius-pill)", border: "none", fontSize: "0.875rem", cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={close} style={{ padding: "10px 24px", backgroundColor: "transparent", color: "var(--jood-ink-muted)", borderRadius: "var(--radius-pill)", border: "1px solid var(--jood-line)", fontSize: "0.875rem", cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {properties.length === 0 && (
        <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.9375rem" }}>No properties yet. Add your first one above.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {properties.map((p) => (
          <div key={p.id} style={{ backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)", padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
                <p style={{ fontWeight: 500, fontSize: "1rem", color: "var(--jood-ink)" }}>{p.name}</p>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--jood-ink-ghost)", letterSpacing: "0.06em" }}>{p.slug}</span>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginTop: "2px" }}>{p.city} · {p.address}</p>
              <div style={{ display: "flex", gap: "16px", marginTop: "6px" }}>
                <Chip label={`${p.bedrooms} bed${p.bedrooms !== 1 ? "s" : ""}`} />
                <Chip label={`${p.max_guests} guests max`} />
                {p.wifi_ssid && <Chip label={`Wi-Fi: ${p.wifi_ssid}`} />}
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              <a href={`/admin/properties/${p.id}/guide`} style={{ padding: "6px 14px", borderRadius: "var(--radius-pill)", border: "1px solid var(--jood-line)", fontSize: "0.8rem", color: "var(--jood-ink-muted)", textDecoration: "none", fontFamily: "inherit" }}>
                Guide
              </a>
              <button onClick={() => openEdit(p)} style={{ padding: "6px 14px", borderRadius: "var(--radius-pill)", border: "1px solid var(--jood-line)", fontSize: "0.8rem", color: "var(--jood-ink-muted)", cursor: "pointer", fontFamily: "inherit", backgroundColor: "transparent" }}>
                Edit
              </button>
              <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} style={{ padding: "6px 14px", borderRadius: "var(--radius-pill)", border: "1px solid var(--jood-line)", fontSize: "0.8rem", color: "var(--jood-danger)", cursor: "pointer", fontFamily: "inherit", backgroundColor: "transparent", opacity: deleting === p.id ? 0.5 : 1 }}>
                {deleting === p.id ? "…" : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span style={{ fontFamily: "var(--font-label)", fontSize: "0.7rem", letterSpacing: "0.08em", color: "var(--jood-ink-ghost)", textTransform: "uppercase" }}>
      {label}
    </span>
  );
}

function FormField({ label, value, onChange, type = "text", placeholder, mono, dir }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; mono?: boolean; dir?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontFamily: "var(--font-label)", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "6px" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "10px 14px",
          border: "1px solid var(--jood-line)",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--jood-ground)",
          color: "var(--jood-ink)",
          fontSize: "0.9375rem",
          fontFamily: mono ? "var(--font-mono)" : "inherit",
          outline: "none",
        }}
      />
    </div>
  );
}
