"use client";

import { useRef, useState } from "react";
import { type PropertySpecs, type RoomSpec, type RoomType, DEFAULT_SPECS } from "@/lib/ops-checklist";

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
  hero_image_url: string | null;
  specs?: PropertySpecs | null;
}

interface Props {
  initialProperties: Property[];
}

const BLANK: Omit<Property, "id"> = {
  slug: "", name: "", name_ar: "", city: "", address: "",
  bedrooms: 1, max_guests: 2, wifi_ssid: "", hero_image_url: null,
  specs: { ...DEFAULT_SPECS, rooms: DEFAULT_SPECS.rooms.map((r) => ({ ...r })) },
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function newRoom(type: RoomType, index: number): RoomSpec {
  const labels: Record<RoomType, string> = {
    bedroom: "Bedroom", bathroom: "Bathroom", living: "Living Room", kitchen: "Kitchen",
  };
  return { id: `r${Date.now()}-${index}`, type, name: labels[type] };
}

export function PropertiesClient({ initialProperties }: Props) {
  const [properties, setProperties]   = useState(initialProperties);
  const [editing, setEditing]         = useState<Property | null>(null);
  const [adding, setAdding]           = useState(false);
  const [form, setForm]               = useState<Omit<Property, "id">>(BLANK);
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroError, setHeroError]     = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openAdd() {
    setForm(BLANK);
    setAdding(true);
    setEditing(null);
    setError(null);
    setHeroError(null);
  }

  function openEdit(p: Property) {
    const specs: PropertySpecs = p.specs && Array.isArray(p.specs.rooms) && p.specs.rooms.length > 0
      ? p.specs
      : { ...DEFAULT_SPECS, rooms: DEFAULT_SPECS.rooms.map((r) => ({ ...r })) };
    setForm({
      slug: p.slug, name: p.name, name_ar: p.name_ar, city: p.city, address: p.address,
      bedrooms: p.bedrooms, max_guests: p.max_guests, wifi_ssid: p.wifi_ssid ?? "",
      hero_image_url: p.hero_image_url, specs,
    });
    setEditing(p);
    setAdding(false);
    setError(null);
    setHeroError(null);
  }

  function close() {
    setAdding(false);
    setEditing(null);
    setError(null);
    setHeroError(null);
  }

  function field(key: keyof Omit<Property, "id">, value: string | number | null | PropertySpecs) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "name" && !editing) next.slug = slugify(String(value));
      return next;
    });
  }

  function setSpecs(fn: (s: PropertySpecs) => PropertySpecs) {
    setForm((f) => ({ ...f, specs: fn(f.specs ?? DEFAULT_SPECS) }));
  }

  function addRoom() {
    setSpecs((s) => ({
      ...s,
      rooms: [...s.rooms, newRoom("bedroom", s.rooms.length)],
    }));
  }

  function removeRoom(id: string) {
    setSpecs((s) => ({ ...s, rooms: s.rooms.filter((r) => r.id !== id) }));
  }

  function updateRoom(id: string, patch: Partial<RoomSpec>) {
    setSpecs((s) => ({
      ...s,
      rooms: s.rooms.map((r) => r.id === id ? { ...r, ...patch } : r),
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const { hero_image_url: _hero, ...payload } = form;
      const body = { ...payload, bedrooms: Number(form.bedrooms), max_guests: Number(form.max_guests) };
      if (editing) {
        const res = await fetch(`/api/admin/properties/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to save"); return; }
        const updated: Property = await res.json();
        updated.hero_image_url = form.hero_image_url;
        setProperties((prev) => prev.map((p) => p.id === updated.id ? updated : p));
      } else {
        const res = await fetch("/api/admin/properties", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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

  async function handleHeroFile(file: File) {
    if (!editing) return;
    setHeroUploading(true);
    setHeroError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/properties/${editing.id}/hero`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setHeroError(data.error ?? "Upload failed"); return; }
      field("hero_image_url", data.hero_image_url);
      setProperties((prev) => prev.map((p) => p.id === editing.id ? { ...p, hero_image_url: data.hero_image_url } : p));
    } finally {
      setHeroUploading(false);
    }
  }

  async function removeHero() {
    if (!editing) return;
    setHeroUploading(true);
    setHeroError(null);
    try {
      await fetch(`/api/admin/properties/${editing.id}/hero`, { method: "DELETE" });
      field("hero_image_url", null);
      setProperties((prev) => prev.map((p) => p.id === editing.id ? { ...p, hero_image_url: null } : p));
    } finally {
      setHeroUploading(false);
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

  const specs = form.specs ?? DEFAULT_SPECS;
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

            {/* ── Cleaning setup ── */}
            <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--jood-line)", paddingTop: "20px", marginTop: "4px" }}>
              <p style={{ fontFamily: "var(--font-label)", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "14px" }}>
                Cleaning setup
              </p>

              {/* Rooms */}
              <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginBottom: "8px" }}>Rooms</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
                {specs.rooms.map((room) => (
                  <div key={room.id} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <select
                      value={room.type}
                      onChange={(e) => updateRoom(room.id, { type: e.target.value as RoomType })}
                      style={selectStyle}
                    >
                      <option value="bedroom">Bedroom</option>
                      <option value="bathroom">Bathroom</option>
                      <option value="living">Living Room</option>
                      <option value="kitchen">Kitchen</option>
                    </select>
                    <input
                      type="text"
                      value={room.name}
                      onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                      placeholder="Room name"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => removeRoom(room.id)}
                      style={{ padding: "8px 12px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-md)", backgroundColor: "transparent", color: "var(--jood-danger)", cursor: "pointer", fontSize: "0.8125rem", fontFamily: "inherit", flexShrink: 0 }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addRoom}
                style={{ padding: "7px 14px", border: "1px dashed var(--jood-line)", borderRadius: "var(--radius-md)", backgroundColor: "transparent", color: "var(--jood-ink-muted)", cursor: "pointer", fontSize: "0.8125rem", fontFamily: "inherit", marginBottom: "20px" }}
              >
                + Add room
              </button>

              {/* Kitchen type — shown only if there is a kitchen room */}
              {specs.rooms.some((r) => r.type === "kitchen") && (
                <div style={{ marginBottom: "16px" }}>
                  <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginBottom: "8px" }}>Kitchen type</p>
                  <div style={{ display: "flex", gap: "16px" }}>
                    {(["full", "kitchenette"] as const).map((kt) => (
                      <label key={kt} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.875rem", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="kitchen_type"
                          value={kt}
                          checked={specs.kitchen_type === kt}
                          onChange={() => setSpecs((s) => ({ ...s, kitchen_type: kt }))}
                        />
                        {kt === "full" ? "Full kitchen" : "Kitchenette"}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Outdoor / pool */}
              <div style={{ display: "flex", gap: "24px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.875rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={specs.has_outdoor}
                    onChange={(e) => setSpecs((s) => ({ ...s, has_outdoor: e.target.checked }))}
                  />
                  Has outdoor / terrace
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.875rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={specs.has_pool}
                    onChange={(e) => setSpecs((s) => ({ ...s, has_pool: e.target.checked }))}
                  />
                  Has pool
                </label>
              </div>
            </div>

            {/* Hero image — only available when editing an existing property */}
            {editing && (
              <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--jood-line)", paddingTop: "20px", marginTop: "4px" }}>
                <label style={{ display: "block", fontFamily: "var(--font-label)", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "12px" }}>
                  Hero image
                </label>

                {form.hero_image_url ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.hero_image_url}
                      alt="Hero"
                      style={{ width: "140px", height: "88px", objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--jood-line)", display: "block" }}
                    />
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={heroUploading}
                        style={{ padding: "8px 16px", borderRadius: "var(--radius-pill)", border: "1px solid var(--jood-line)", fontSize: "0.8125rem", cursor: "pointer", backgroundColor: "transparent", color: "var(--jood-ink-muted)", fontFamily: "inherit", opacity: heroUploading ? 0.6 : 1 }}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={removeHero}
                        disabled={heroUploading}
                        style={{ padding: "8px 16px", borderRadius: "var(--radius-pill)", border: "1px solid var(--jood-line)", fontSize: "0.8125rem", cursor: "pointer", backgroundColor: "transparent", color: "var(--jood-danger)", fontFamily: "inherit", opacity: heroUploading ? 0.6 : 1 }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={heroUploading}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      width: "140px", height: "88px",
                      border: "1.5px dashed var(--jood-line)", borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--jood-ground)", color: "var(--jood-ink-muted)",
                      fontSize: "0.8125rem", cursor: "pointer", fontFamily: "inherit", flexDirection: "column",
                    }}
                  >
                    {heroUploading ? <span>Uploading…</span> : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <span style={{ fontSize: "0.75rem" }}>Add photo</span>
                      </>
                    )}
                  </button>
                )}

                {heroUploading && !form.hero_image_url && (
                  <p style={{ fontSize: "0.8rem", color: "var(--jood-ink-muted)", marginTop: "8px" }}>Uploading…</p>
                )}
                {heroError && (
                  <p style={{ color: "var(--jood-danger)", fontSize: "0.8125rem", marginTop: "8px" }}>{heroError}</p>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleHeroFile(file);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
          </div>

          {error && (
            <p style={{ color: "var(--jood-danger)", fontSize: "0.8125rem", marginTop: "12px" }}>{error}</p>
          )}

          {adding && (
            <p style={{ fontSize: "0.8rem", color: "var(--jood-ink-muted)", marginTop: "16px", marginBottom: "-4px" }}>
              Save the property first, then edit it to add a hero image.
            </p>
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
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
              {p.hero_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.hero_image_url}
                  alt=""
                  style={{ width: "56px", height: "40px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--jood-line)", flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: "56px", height: "40px", borderRadius: "8px", border: "1.5px dashed var(--jood-line)", backgroundColor: "var(--jood-ground)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--jood-ink-ghost)" }}>
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
                  <p style={{ fontWeight: 500, fontSize: "1rem", color: "var(--jood-ink)" }}>{p.name}</p>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--jood-ink-ghost)", letterSpacing: "0.06em" }}>{p.slug}</span>
                </div>
                <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginTop: "2px" }}>{p.city} · {p.address}</p>
                <div style={{ display: "flex", gap: "16px", marginTop: "6px", flexWrap: "wrap" }}>
                  <Chip label={`${p.bedrooms} bed${p.bedrooms !== 1 ? "s" : ""}`} />
                  <Chip label={`${p.max_guests} guests max`} />
                  {p.wifi_ssid && <Chip label={`Wi-Fi: ${p.wifi_ssid}`} />}
                  {p.specs?.rooms?.length ? (
                    <Chip label={`${p.specs.rooms.filter((r) => r.type === "bedroom").length} bedrooms · ${p.specs.rooms.filter((r) => r.type === "bathroom").length} bathrooms`} />
                  ) : null}
                </div>
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

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--jood-ground)",
  color: "var(--jood-ink)",
  fontSize: "0.875rem",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  width: "140px",
  flexShrink: 0,
};

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
