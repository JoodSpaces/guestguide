"use client";

import { useState } from "react";

export interface Service {
  id: string;
  category: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  price_egp: number;
  lead_hours: number;
  is_active: boolean;
  sort_order: number;
}

const CATEGORIES = [
  { value: "early_checkin", label: "Early Check-in" },
  { value: "late_checkout", label: "Late Checkout" },
  { value: "transfer", label: "Transfer" },
  { value: "housekeeping", label: "Housekeeping" },
  { value: "amenities", label: "Amenities" },
  { value: "food", label: "Food & Drink" },
  { value: "other", label: "Other" },
];

const card: React.CSSProperties = {
  backgroundColor: "var(--jood-surface)",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-lg)",
  padding: "16px 20px",
  marginBottom: "10px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--jood-ground)",
  color: "var(--jood-ink)",
  fontSize: "0.875rem",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const blank = (): Omit<Service, "id"> => ({
  category: "other",
  name_en: "",
  name_ar: "",
  description_en: null,
  description_ar: null,
  price_egp: 0,
  lead_hours: 0,
  is_active: true,
  sort_order: 0,
});

function ServiceForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Omit<Service, "id">;
  onSave: (data: Omit<Service, "id">) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const err = await onSave(form);
    setSaving(false);
    if (err) setError(err);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px" }}>Name (EN) *</label>
          <input required value={form.name_en} onChange={(e) => set("name_en", e.target.value)} placeholder="Late checkout" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px" }}>Name (AR)</label>
          <input value={form.name_ar} onChange={(e) => set("name_ar", e.target.value)} placeholder="تأخير المغادرة" style={{ ...inputStyle, direction: "rtl" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px" }}>Description (EN)</label>
          <textarea value={form.description_en ?? ""} onChange={(e) => set("description_en", e.target.value || null)} placeholder="Optional detail…" style={{ ...inputStyle, resize: "vertical", minHeight: "60px" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px" }}>Description (AR)</label>
          <textarea value={form.description_ar ?? ""} onChange={(e) => set("description_ar", e.target.value || null)} placeholder="وصف اختياري…" style={{ ...inputStyle, resize: "vertical", minHeight: "60px", direction: "rtl" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px" }}>Category</label>
          <select value={form.category} onChange={(e) => set("category", e.target.value)} style={inputStyle}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px" }}>Price (EGP)</label>
          <input type="number" min="0" value={form.price_egp} onChange={(e) => set("price_egp", parseInt(e.target.value) || 0)} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px" }}>Lead time (hrs)</label>
          <input type="number" min="0" value={form.lead_hours} onChange={(e) => set("lead_hours", parseInt(e.target.value) || 0)} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px" }}>Sort order</label>
          <input type="number" value={form.sort_order} onChange={(e) => set("sort_order", parseInt(e.target.value) || 0)} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} style={{ width: "16px", height: "16px" }} />
        <label htmlFor="is_active" style={{ fontSize: "0.875rem", cursor: "pointer" }}>Active (visible to guests)</label>
      </div>

      {error && (
        <p style={{ fontSize: "0.875rem", color: "var(--jood-danger)", padding: "10px 14px", backgroundColor: "rgba(220,50,50,0.07)", borderRadius: "var(--radius-md)" }}>
          {error}
        </p>
      )}
      <div style={{ display: "flex", gap: "10px" }}>
        <button type="submit" disabled={saving} style={{ padding: "9px 20px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} style={{ padding: "9px 16px", background: "none", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: "pointer", color: "var(--jood-ink-muted)" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function ServicesEditor({ initialServices }: { initialServices: Service[] }) {
  const [services, setServices] = useState(initialServices);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleCreate(data: Omit<Service, "id">): Promise<string | null> {
    const res = await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameEn: data.name_en,
        nameAr: data.name_ar,
        descriptionEn: data.description_en,
        descriptionAr: data.description_ar,
        category: data.category,
        priceEgp: data.price_egp,
        leadHours: data.lead_hours,
        isActive: data.is_active,
        sortOrder: data.sort_order,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setServices((s) => [...s, created]);
      setAdding(false);
      return null;
    }
    const body = await res.json().catch(() => ({}));
    return body.error ?? `Server error (${res.status})`;
  }

  async function handleUpdate(id: string, data: Omit<Service, "id">): Promise<string | null> {
    const res = await fetch(`/api/admin/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameEn: data.name_en,
        nameAr: data.name_ar,
        descriptionEn: data.description_en,
        descriptionAr: data.description_ar,
        category: data.category,
        priceEgp: data.price_egp,
        leadHours: data.lead_hours,
        isActive: data.is_active,
        sortOrder: data.sort_order,
      }),
    });
    if (res.ok) {
      setServices((s) => s.map((svc) => svc.id === id ? { ...svc, ...data } : svc));
      setEditingId(null);
      return null;
    }
    const body = await res.json().catch(() => ({}));
    return body.error ?? `Server error (${res.status})`;
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this service? This cannot be undone.")) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
    if (res.ok) setServices((s) => s.filter((svc) => svc.id !== id));
    setDeleting(null);
  }

  async function toggleActive(svc: Service) {
    await fetch(`/api/admin/services/${svc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !svc.is_active }),
    });
    setServices((s) => s.map((x) => x.id === svc.id ? { ...x, is_active: !svc.is_active } : x));
  }

  const catLabel = (cat: string) => CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h1 className="font-display" style={{ fontSize: "1.8rem" }}>Services</h1>
        {!adding && (
          <button onClick={() => setAdding(true)} style={{ padding: "9px 18px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: "pointer" }}>
            + Service
          </button>
        )}
      </div>

      {adding && (
        <div style={{ ...card, border: "1px solid var(--jood-accent)", marginBottom: "20px" }}>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-accent)", marginBottom: "16px" }}>New service</p>
          <ServiceForm initial={blank()} onSave={handleCreate} onCancel={() => setAdding(false)} />
        </div>
      )}

      {!services.length && !adding && (
        <div style={{ ...card, textAlign: "center", padding: "40px", color: "var(--jood-ink-muted)" }}>
          No services yet — add your first one.
        </div>
      )}

      {services.map((svc) => (
        <div key={svc.id} style={{ ...card, opacity: svc.is_active ? 1 : 0.55 }}>
          {editingId === svc.id ? (
            <>
              <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "16px" }}>Editing</p>
              <ServiceForm
                initial={{ name_en: svc.name_en, name_ar: svc.name_ar, description_en: svc.description_en, description_ar: svc.description_ar, category: svc.category, price_egp: svc.price_egp, lead_hours: svc.lead_hours, is_active: svc.is_active, sort_order: svc.sort_order }}
                onSave={(data) => handleUpdate(svc.id, data)}
                onCancel={() => setEditingId(null)}
              />
            </>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <p style={{ fontWeight: 500, fontSize: "0.9375rem" }}>{svc.name_en}</p>
                  {svc.name_ar && <p style={{ fontSize: "0.875rem", color: "var(--jood-ink-muted)", direction: "rtl" }}>{svc.name_ar}</p>}
                  <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--jood-ink-ghost)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", padding: "2px 7px" }}>{catLabel(svc.category)}</span>
                </div>
                <div style={{ display: "flex", gap: "16px", fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>
                  <span>{svc.price_egp === 0 ? "Free" : `${svc.price_egp.toLocaleString()} EGP`}</span>
                  {svc.lead_hours > 0 && <span>{svc.lead_hours}h lead time</span>}
                  {svc.description_en && <span style={{ fontStyle: "italic" }}>{svc.description_en.slice(0, 60)}{svc.description_en.length > 60 ? "…" : ""}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <button onClick={() => toggleActive(svc)} style={{ padding: "6px 12px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", background: "none", fontSize: "0.75rem", cursor: "pointer", color: svc.is_active ? "var(--jood-success)" : "var(--jood-ink-muted)" }}>
                  {svc.is_active ? "Active" : "Inactive"}
                </button>
                <button onClick={() => setEditingId(svc.id)} style={{ padding: "6px 12px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", background: "none", fontSize: "0.75rem", cursor: "pointer", color: "var(--jood-ink-muted)" }}>Edit</button>
                <button onClick={() => handleDelete(svc.id)} disabled={deleting === svc.id} style={{ padding: "6px 12px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", background: "none", fontSize: "0.75rem", cursor: "pointer", color: "var(--jood-danger)" }}>
                  {deleting === svc.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
