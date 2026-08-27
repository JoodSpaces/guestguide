"use client";

import { useState } from "react";

export interface InventoryItem {
  id: string;
  property_id: string;
  category: string;
  name: string;
  unit: string;
  par_level: number;
  current_stock: number;
}

interface Props {
  propertyId: string;
  propertyName: string;
  initialItems: InventoryItem[];
}

const CATEGORIES = ["linen", "consumables", "kitchen", "amenities", "general"];

const input: React.CSSProperties = {
  padding: "7px 10px",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--jood-ground)",
  color: "var(--jood-ink)",
  fontSize: "0.875rem",
  width: "100%",
  boxSizing: "border-box",
};

export function InventoryClient({ propertyId, propertyName, initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ category: "linen", name: "", unit: "pcs", par_level: 0, current_stock: 0 });
  const [addingPending, setAddingPending] = useState(false);

  const grouped = CATEGORIES.reduce<Record<string, InventoryItem[]>>((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {});

  const lowStock = items.filter((i) => i.par_level > 0 && i.current_stock < i.par_level);

  async function updateStock(itemId: string, field: "current_stock" | "par_level", value: number) {
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, [field]: value } : i));
    setSaving((s) => ({ ...s, [itemId]: true }));
    await fetch(`/api/admin/ops/inventory/${propertyId}/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setSaving((s) => ({ ...s, [itemId]: false }));
  }

  async function deleteItem(itemId: string) {
    if (!confirm("Remove this item?")) return;
    const res = await fetch(`/api/admin/ops/inventory/${propertyId}/${itemId}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  async function addItem() {
    if (!newItem.name.trim()) return;
    setAddingPending(true);
    const res = await fetch(`/api/admin/ops/inventory/${propertyId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newItem, name: newItem.name.trim() }),
    });
    setAddingPending(false);
    if (res.ok) {
      const { id } = await res.json();
      setItems((prev) => [...prev, { id, property_id: propertyId, ...newItem, name: newItem.name.trim() }]);
      setNewItem({ category: "linen", name: "", unit: "pcs", par_level: 0, current_stock: 0 });
      setAdding(false);
    }
  }

  return (
    <div>
      <a href="/admin/ops" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--jood-ink-muted)", textDecoration: "none", fontSize: "0.8125rem", marginBottom: "20px" }}>
        ← Ops
      </a>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "6px" }}>Inventory</p>
          <h1 className="font-display" style={{ fontSize: "1.8rem" }}>{propertyName}</h1>
        </div>
        {lowStock.length > 0 && (
          <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--jood-danger)", border: "1px solid var(--jood-danger)", borderRadius: "var(--radius-pill)", padding: "4px 10px" }}>
            {lowStock.length} low stock
          </span>
        )}
      </div>

      {lowStock.length > 0 && (
        <div style={{ backgroundColor: "rgba(201,48,48,0.06)", border: "1px solid var(--jood-danger)", borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: "16px" }}>
          <p style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--jood-danger)", marginBottom: "6px" }}>Low stock alert</p>
          {lowStock.map((i) => (
            <p key={i.id} style={{ fontSize: "0.8125rem", color: "var(--jood-danger)" }}>
              {i.name} — {i.current_stock} {i.unit} (min {i.par_level})
            </p>
          ))}
        </div>
      )}

      {CATEGORIES.map((cat) => {
        const catItems = grouped[cat];
        if (!catItems?.length && !adding) return null;
        return (
          <div key={cat} style={{ marginBottom: "20px" }}>
            <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "8px" }}>{cat}</p>
            <div style={{ backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 36px", gap: "8px", padding: "8px 16px", borderBottom: "1px solid var(--jood-line)", backgroundColor: "var(--jood-mist2, var(--jood-surface))" }}>
                {["Item", "Stock", "Min", "Unit", ""].map((h) => (
                  <span key={h} style={{ fontFamily: "var(--font-label)", fontSize: "8px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--jood-ink-muted)" }}>{h}</span>
                ))}
              </div>
              {catItems.map((item) => {
                const low = item.par_level > 0 && item.current_stock < item.par_level;
                return (
                  <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 36px", gap: "8px", padding: "10px 16px", borderBottom: "1px solid var(--jood-line)", alignItems: "center", backgroundColor: low ? "rgba(201,48,48,0.03)" : "transparent" }}>
                    <span style={{ fontSize: "0.875rem", color: low ? "var(--jood-danger)" : "var(--jood-ink)", fontWeight: low ? 500 : 400 }}>{item.name}</span>
                    <input
                      type="number"
                      value={item.current_stock}
                      min={0}
                      onChange={(e) => updateStock(item.id, "current_stock", parseInt(e.target.value) || 0)}
                      style={{ ...input, color: low ? "var(--jood-danger)" : "var(--jood-ink)", fontWeight: low ? 500 : 400 }}
                    />
                    <input
                      type="number"
                      value={item.par_level}
                      min={0}
                      onChange={(e) => updateStock(item.id, "par_level", parseInt(e.target.value) || 0)}
                      style={input}
                    />
                    <span style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>{item.unit}</span>
                    <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--jood-ink-faint)", fontSize: "16px" }}>×</button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Add item */}
      {adding ? (
        <div style={{ backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)", padding: "16px 20px", marginBottom: "10px" }}>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "12px" }}>New item</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--jood-ink-muted)", display: "block", marginBottom: "4px" }}>Category</label>
              <select value={newItem.category} onChange={(e) => setNewItem((n) => ({ ...n, category: e.target.value }))} style={{ ...input, textTransform: "capitalize" }}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--jood-ink-muted)", display: "block", marginBottom: "4px" }}>Name</label>
              <input value={newItem.name} onChange={(e) => setNewItem((n) => ({ ...n, name: e.target.value }))} style={input} placeholder="e.g. Bath towel" />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--jood-ink-muted)", display: "block", marginBottom: "4px" }}>Unit</label>
              <input value={newItem.unit} onChange={(e) => setNewItem((n) => ({ ...n, unit: e.target.value }))} style={input} placeholder="pcs, sets, bottles..." />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--jood-ink-muted)", display: "block", marginBottom: "4px" }}>Min stock</label>
              <input type="number" value={newItem.par_level} min={0} onChange={(e) => setNewItem((n) => ({ ...n, par_level: parseInt(e.target.value) || 0 }))} style={input} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={addItem} disabled={addingPending || !newItem.name.trim()} style={{ padding: "8px 16px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.8125rem", cursor: "pointer", opacity: addingPending || !newItem.name.trim() ? 0.5 : 1 }}>
              {addingPending ? "Adding…" : "Add"}
            </button>
            <button onClick={() => setAdding(false)} style={{ padding: "8px 16px", backgroundColor: "transparent", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", fontSize: "0.8125rem", cursor: "pointer", color: "var(--jood-ink-muted)" }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ width: "100%", padding: "14px", backgroundColor: "transparent", border: "2px dashed var(--jood-line)", borderRadius: "var(--radius-lg)", fontSize: "0.875rem", cursor: "pointer", color: "var(--jood-ink-muted)" }}>
          + Add item
        </button>
      )}
    </div>
  );
}
