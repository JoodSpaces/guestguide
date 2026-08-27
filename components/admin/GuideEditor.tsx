"use client";

import { useState, useTransition } from "react";

const SECTION_OPTIONS = [
  { value: "wifi",       label: "Wi-Fi" },
  { value: "checkin",    label: "Check-in" },
  { value: "checkout",   label: "Check-out" },
  { value: "ac",         label: "AC & Heating" },
  { value: "kitchen",    label: "Kitchen" },
  { value: "pool",       label: "Pool & Outdoor" },
  { value: "parking",    label: "Parking" },
  { value: "appliances", label: "Appliances" },
  { value: "rules",      label: "House Rules" },
  { value: "quiet",      label: "Quiet Hours" },
  { value: "smoking",    label: "Smoking" },
  { value: "pets",       label: "Pets" },
  { value: "trash",      label: "Trash" },
  { value: "emergency",  label: "Emergency Contacts" },
  { value: "other",      label: "Other" },
];

export interface ContentSection {
  id: string;
  section: string;
  sort_order: number;
  title_en: string;
  title_ar: string;
  body_en: string;
  body_ar: string;
  is_published: boolean;
}

interface Props {
  propertyId: string;
  propertyName: string;
  initialSections: ContentSection[];
}

function sectionLabel(val: string) {
  return SECTION_OPTIONS.find((o) => o.value === val)?.label ?? val;
}

const card: React.CSSProperties = {
  backgroundColor: "var(--jood-surface)",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-lg)",
  padding: "20px 24px",
  marginBottom: "10px",
};

const label: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "0.65rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--jood-ink-muted)",
  display: "block",
  marginBottom: "5px",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--jood-ground)",
  color: "var(--jood-ink)",
  fontSize: "0.875rem",
  fontFamily: "var(--font-body)",
  outline: "none",
  boxSizing: "border-box",
};

const textarea: React.CSSProperties = {
  ...input,
  resize: "vertical",
  minHeight: "90px",
  lineHeight: 1.6,
};

const select: React.CSSProperties = {
  ...input,
  cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  padding: "9px 18px",
  backgroundColor: "var(--jood-ink)",
  color: "var(--jood-ground)",
  border: "none",
  borderRadius: "var(--radius-pill)",
  fontSize: "0.8125rem",
  fontFamily: "var(--font-label)",
  letterSpacing: "0.06em",
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  padding: "7px 14px",
  backgroundColor: "transparent",
  color: "var(--jood-danger)",
  border: "1px solid var(--jood-danger)",
  borderRadius: "var(--radius-pill)",
  fontSize: "0.75rem",
  fontFamily: "var(--font-label)",
  letterSpacing: "0.06em",
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  padding: "7px 14px",
  backgroundColor: "transparent",
  color: "var(--jood-ink-muted)",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-pill)",
  fontSize: "0.75rem",
  fontFamily: "var(--font-label)",
  letterSpacing: "0.06em",
  cursor: "pointer",
};

interface SectionState {
  data: ContentSection;
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
  expanded: boolean;
}

export function GuideEditor({ propertyId, propertyName, initialSections }: Props) {
  const [sections, setSections] = useState<SectionState[]>(
    initialSections.map((s) => ({
      data: { ...s },
      dirty: false,
      saving: false,
      saved: false,
      error: null,
      expanded: true,
    }))
  );
  const [adding, setAdding] = useState(false);
  const [addSection, setAddSection] = useState("wifi");
  const [addingPending, startAddTransition] = useTransition();

  function update(id: string, field: keyof ContentSection, value: unknown) {
    setSections((prev) =>
      prev.map((s) =>
        s.data.id === id
          ? { ...s, data: { ...s.data, [field]: value }, dirty: true, saved: false, error: null }
          : s
      )
    );
  }

  async function save(id: string) {
    const s = sections.find((s) => s.data.id === id);
    if (!s) return;

    setSections((prev) => prev.map((x) => x.data.id === id ? { ...x, saving: true, error: null } : x));

    const res = await fetch(`/api/admin/properties/${propertyId}/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: s.data.section,
        sort_order: s.data.sort_order,
        title_en: s.data.title_en,
        title_ar: s.data.title_ar,
        body_en: s.data.body_en,
        body_ar: s.data.body_ar,
        is_published: s.data.is_published,
      }),
    });

    if (res.ok) {
      setSections((prev) => prev.map((x) => x.data.id === id ? { ...x, saving: false, dirty: false, saved: true } : x));
      setTimeout(() => setSections((prev) => prev.map((x) => x.data.id === id ? { ...x, saved: false } : x)), 2500);
    } else {
      const j = await res.json().catch(() => ({}));
      setSections((prev) => prev.map((x) => x.data.id === id ? { ...x, saving: false, error: j.error ?? "Save failed" } : x));
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this section? This cannot be undone.")) return;

    const res = await fetch(`/api/admin/properties/${propertyId}/content/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSections((prev) => prev.filter((x) => x.data.id !== id));
    }
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setSections((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((s, i) => ({ ...s, data: { ...s.data, sort_order: i }, dirty: true }));
    });
  }

  function moveDown(idx: number) {
    setSections((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((s, i) => ({ ...s, data: { ...s.data, sort_order: i }, dirty: true }));
    });
  }

  function addNew() {
    startAddTransition(async () => {
      const res = await fetch(`/api/admin/properties/${propertyId}/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: addSection,
          sort_order: sections.length,
          title_en: sectionLabel(addSection),
          title_ar: "",
          body_en: "",
          body_ar: "",
          is_published: false,
        }),
      });

      if (res.ok) {
        const { id } = await res.json();
        setSections((prev) => [
          ...prev,
          {
            data: {
              id,
              section: addSection,
              sort_order: prev.length,
              title_en: sectionLabel(addSection),
              title_ar: "",
              body_en: "",
              body_ar: "",
              is_published: false,
            },
            dirty: false,
            saving: false,
            saved: false,
            error: null,
            expanded: true,
          },
        ]);
        setAdding(false);
      }
    });
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <a
          href="/admin/bookings"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--jood-ink-muted)", textDecoration: "none", fontSize: "0.8125rem", marginBottom: "20px" }}
        >
          ← Bookings
        </a>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontFamily: "var(--font-label)", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "6px" }}>
              Unit guide — edit
            </p>
            <h1 className="font-display" style={{ fontSize: "1.8rem", lineHeight: 1.1 }}>{propertyName}</h1>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)" }}>
            {sections.length} sections
          </span>
        </div>
      </div>

      {/* Sections */}
      {sections.length === 0 && (
        <div style={{ ...card, color: "var(--jood-ink-muted)", textAlign: "center", padding: "40px" }}>
          No sections yet. Add one below.
        </div>
      )}

      {sections.map((s, idx) => (
        <div key={s.data.id} style={{ ...card, opacity: s.data.is_published ? 1 : 0.65 }}>
          {/* Section header row */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: s.expanded ? "16px" : 0 }}>
            {/* Reorder */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
              <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", color: idx === 0 ? "var(--jood-line)" : "var(--jood-ink-muted)", fontSize: "10px", lineHeight: 1, padding: "2px" }}>▲</button>
              <button onClick={() => moveDown(idx)} disabled={idx === sections.length - 1} style={{ background: "none", border: "none", cursor: idx === sections.length - 1 ? "default" : "pointer", color: idx === sections.length - 1 ? "var(--jood-line)" : "var(--jood-ink-muted)", fontSize: "10px", lineHeight: 1, padding: "2px" }}>▼</button>
            </div>

            {/* Section type badge */}
            <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-accent)", backgroundColor: "rgba(255,96,55,0.08)", borderRadius: "var(--radius-pill)", padding: "3px 9px", flexShrink: 0 }}>
              {sectionLabel(s.data.section)}
            </span>

            {/* Title preview */}
            <span style={{ flex: 1, minWidth: 0, fontWeight: 500, fontSize: "0.875rem", color: "var(--jood-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.data.title_en || <span style={{ color: "var(--jood-ink-faint)" }}>Untitled</span>}
            </span>

            {/* Published toggle */}
            <button
              onClick={() => update(s.data.id, "is_published", !s.data.is_published)}
              style={{ ...btnGhost, padding: "5px 10px", fontSize: "0.7rem", color: s.data.is_published ? "var(--jood-success)" : "var(--jood-ink-muted)", borderColor: s.data.is_published ? "var(--jood-success)" : "var(--jood-line)" }}
            >
              {s.data.is_published ? "Published" : "Hidden"}
            </button>

            {/* Expand / collapse */}
            <button
              onClick={() => setSections((prev) => prev.map((x) => x.data.id === s.data.id ? { ...x, expanded: !x.expanded } : x))}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--jood-ink-muted)", fontSize: "0.8rem", padding: "4px 6px" }}
            >
              {s.expanded ? "▲" : "▼"}
            </button>
          </div>

          {s.expanded && (
            <>
              {/* Section type selector */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={label}>Section type</label>
                  <select
                    value={s.data.section}
                    onChange={(e) => update(s.data.id, "section", e.target.value)}
                    style={select}
                  >
                    {SECTION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={label}>Sort order</label>
                  <input
                    type="number"
                    value={s.data.sort_order}
                    onChange={(e) => update(s.data.id, "sort_order", parseInt(e.target.value) || 0)}
                    style={input}
                    min={0}
                  />
                </div>
              </div>

              {/* Titles */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={label}>Title (English)</label>
                  <input
                    type="text"
                    value={s.data.title_en}
                    onChange={(e) => update(s.data.id, "title_en", e.target.value)}
                    style={input}
                    placeholder="e.g. Wi-Fi Access"
                  />
                </div>
                <div dir="rtl">
                  <label style={{ ...label, textAlign: "right" }}>العنوان (عربي)</label>
                  <input
                    type="text"
                    value={s.data.title_ar}
                    onChange={(e) => update(s.data.id, "title_ar", e.target.value)}
                    style={{ ...input, fontFamily: "var(--font-arabic)", direction: "rtl" }}
                    placeholder="مثال: الواي فاي"
                  />
                </div>
              </div>

              {/* Bodies */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={label}>Content (English)</label>
                  <textarea
                    value={s.data.body_en}
                    onChange={(e) => update(s.data.id, "body_en", e.target.value)}
                    style={textarea}
                    placeholder="Instructions, details, notes..."
                  />
                </div>
                <div dir="rtl">
                  <label style={{ ...label, textAlign: "right" }}>المحتوى (عربي)</label>
                  <textarea
                    value={s.data.body_ar}
                    onChange={(e) => update(s.data.id, "body_ar", e.target.value)}
                    style={{ ...textarea, fontFamily: "var(--font-arabic)", direction: "rtl" }}
                    placeholder="التعليمات والتفاصيل..."
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={() => save(s.data.id)}
                  disabled={s.saving || !s.dirty}
                  style={{ ...btnPrimary, opacity: s.saving || !s.dirty ? 0.5 : 1 }}
                >
                  {s.saving ? "Saving…" : s.saved ? "Saved ✓" : "Save"}
                </button>
                {s.error && (
                  <span style={{ fontSize: "0.8125rem", color: "var(--jood-danger)" }}>{s.error}</span>
                )}
                <div style={{ flex: 1 }} />
                <button onClick={() => remove(s.data.id)} style={btnDanger}>Delete</button>
              </div>
            </>
          )}
        </div>
      ))}

      {/* Add section */}
      {adding ? (
        <div style={{ ...card, backgroundColor: "var(--jood-surface-raised)" }}>
          <p style={{ ...label, marginBottom: "10px" }}>New section</p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <select
              value={addSection}
              onChange={(e) => setAddSection(e.target.value)}
              style={{ ...select, flex: 1 }}
            >
              {SECTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button onClick={addNew} disabled={addingPending} style={{ ...btnPrimary, opacity: addingPending ? 0.5 : 1 }}>
              {addingPending ? "Adding…" : "Add"}
            </button>
            <button onClick={() => setAdding(false)} style={btnGhost}>Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{ ...btnGhost, width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "6px", padding: "14px" }}
        >
          + Add section
        </button>
      )}
    </div>
  );
}
