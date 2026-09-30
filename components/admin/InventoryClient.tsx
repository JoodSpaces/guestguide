"use client";

import { useState, useRef, useCallback } from "react";
import { BedDouble, Droplets, Utensils, Leaf, Package, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/admin/Toaster";
import { stockStatus, type StockStatus } from "@/lib/inventory";

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

const CATEGORY_META: Record<string, { label: string; icon: LucideIcon }> = {
  linen:       { label: "Linens",      icon: BedDouble },
  consumables: { label: "Consumables", icon: Droplets },
  kitchen:     { label: "Kitchen",     icon: Utensils },
  amenities:   { label: "Amenities",   icon: Leaf },
  general:     { label: "General",     icon: Package },
};
const CATEGORIES = ["linen", "consumables", "kitchen", "amenities", "general"];

const STATUS_COLOR: Record<StockStatus, string> = {
  critical: "var(--jood-danger)",
  low:      "var(--jood-accent)",
  ok:       "var(--jood-success)",
  unset:    "var(--jood-line)",
};

const inputStyle: React.CSSProperties = {
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
  const [items, setItems]               = useState(initialItems);
  const [adding, setAdding]             = useState(false);
  const [addingPending, setAddingPending] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newItem, setNewItem]           = useState({ category: "linen", name: "", unit: "pcs", par_level: 0, current_stock: 0 });

  const grouped = CATEGORIES.reduce<Record<string, InventoryItem[]>>((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {});

  const outOfStock = items.filter((i) => i.par_level > 0 && i.current_stock === 0);
  const lowStock   = items.filter((i) => i.par_level > 0 && i.current_stock > 0 && i.current_stock < i.par_level);

  const base = `/api/admin/ops/inventory/${propertyId}`;
  const pendingDelta = useRef<Record<string, number>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Put the screen back in step with the server (after a failed save, or a change made elsewhere).
  const reload = useCallback(async () => {
    const res = await fetch(base).catch(() => null);
    if (!res?.ok) return;
    const rows = (await res.json()) as InventoryItem[];
    setItems(rows.map((r) => ({ id: r.id, property_id: r.property_id, category: r.category, name: r.name, unit: r.unit, par_level: r.par_level, current_stock: r.current_stock })));
  }, [base]);

  // Taps add up into ONE relative change ("+3"), sent a moment after the last tap. A relative change cannot overwrite
  // what a turnover or a service did to the same item meanwhile, which an absolute number would.
  function step(itemId: string, delta: number) {
    const current = items.find((i) => i.id === itemId);
    if (!current) return;
    const next = Math.max(0, current.current_stock + delta);
    const applied = next - current.current_stock;
    if (applied === 0) return;
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, current_stock: next } : i)));
    pendingDelta.current[itemId] = (pendingDelta.current[itemId] ?? 0) + applied;
    clearTimeout(timers.current[itemId]);
    timers.current[itemId] = setTimeout(async () => {
      const d = pendingDelta.current[itemId] ?? 0;
      pendingDelta.current[itemId] = 0;
      if (!d) return;
      const res = await fetch(`${base}/${itemId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delta: d }),
      }).catch(() => null);
      if (res?.ok) {
        const { current_stock } = (await res.json()) as { current_stock: number | null };
        // Show the server's number: it includes anything that changed in the meantime.
        if (typeof current_stock === "number" && !pendingDelta.current[itemId]) {
          setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, current_stock } : i)));
        }
        toast("Stock updated");
      } else {
        toast("Could not save the count. Showing the saved number.", "error");
        await reload();
      }
    }, 600);
  }

  const parTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  function setParLevel(itemId: string, value: number) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, par_level: value } : i)));
    clearTimeout(parTimers.current[itemId]);
    parTimers.current[itemId] = setTimeout(async () => {
      const res = await fetch(`${base}/${itemId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ par_level: value }),
      }).catch(() => null);
      if (res?.ok) toast("Saved");
      else { toast("Could not save. Showing the saved value.", "error"); await reload(); }
    }, 600);
  }

  async function deleteItem(itemId: string) {
    if (!confirm("Remove this item from the list? Its history is kept.")) return;
    const res = await fetch(`${base}/${itemId}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) setItems((prev) => prev.filter((i) => i.id !== itemId));
    else toast("Could not remove the item.", "error");
  }

  async function addItem() {
    if (!newItem.name.trim()) return;
    setAddingPending(true);
    setAddError(null);
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newItem, name: newItem.name.trim() }),
    }).catch(() => null);
    setAddingPending(false);
    if (res?.ok) {
      const { id } = await res.json();
      setItems((prev) => [...prev, { id, property_id: propertyId, ...newItem, name: newItem.name.trim() }]);
      setNewItem({ category: "linen", name: "", unit: "pcs", par_level: 0, current_stock: 0 });
      setAdding(false);
    } else {
      const data = await res?.json().catch(() => null);
      setAddError(data?.message ?? "Could not add the item. Check your connection and try again.");
    }
  }

  return (
    <div style={{ maxWidth: "700px" }}>
      <Link href="/admin/ops" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--jood-ink-muted)", textDecoration: "none", fontSize: "0.8125rem", marginBottom: "20px" }}>
        ← Ops
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "6px" }}>
            Inventory
          </p>
          <h1 className="font-display" style={{ fontSize: "1.8rem" }}>{propertyName}</h1>
        </div>

        {/* Summary pills */}
        {items.length > 0 && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--jood-ink-muted)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", padding: "4px 10px" }}>
              {items.length} tracked
            </span>
            {lowStock.length > 0 && (
              <span style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--jood-accent)", border: "1px solid var(--jood-accent)", borderRadius: "var(--radius-pill)", padding: "4px 10px" }}>
                {lowStock.length} low
              </span>
            )}
            {outOfStock.length > 0 && (
              <span style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--jood-danger)", border: "1px solid var(--jood-danger)", borderRadius: "var(--radius-pill)", padding: "4px 10px" }}>
                {outOfStock.length} out
              </span>
            )}
          </div>
        )}
      </div>

      {/* Category sections */}
      {CATEGORIES.map((cat) => {
        const catItems = grouped[cat];
        if (!catItems?.length) return null;
        const meta = CATEGORY_META[cat] ?? { label: cat, icon: Package };
        return (
          <div key={cat} style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              {(() => { const Icon = meta.icon; return <Icon size={14} strokeWidth={1.75} style={{ color: "var(--jood-ink-muted)" }} />; })()}
              <span style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)" }}>
                {meta.label}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--jood-ink-subtle)" }}>
                {catItems.length}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {catItems.map((item) => {
                const status  = stockStatus(item.current_stock, item.par_level);
                const gaugePct = item.par_level > 0 ? Math.min(1, item.current_stock / item.par_level) : null;

                return (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: "var(--jood-surface)",
                      border: "1px solid var(--jood-line)",
                      borderRadius: "var(--radius-lg)",
                      padding: "12px 16px",
                      display: "grid",
                      gridTemplateColumns: "10px 1fr auto 28px",
                      gap: "14px",
                      alignItems: "center",
                    }}
                  >
                    {/* Status dot */}
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: STATUS_COLOR[status], flexShrink: 0 }} />

                    {/* Name + gauge */}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: "0.875rem", color: "var(--jood-ink)", marginBottom: gaugePct !== null ? "6px" : 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.name}
                      </p>
                      {gaugePct !== null && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ flex: 1, height: "3px", backgroundColor: "var(--jood-line)", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{
                              height: "100%",
                              width: `${gaugePct * 100}%`,
                              backgroundColor: STATUS_COLOR[status],
                              borderRadius: "2px",
                              transition: "width 400ms cubic-bezier(0.16, 1, 0.3, 1)",
                            }} />
                          </div>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: STATUS_COLOR[status], flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                            {item.current_stock}/{item.par_level} {item.unit}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Par input + stepper */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {/* Par level */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                        <input
                          type="number"
                          value={item.par_level}
                          min={0}
                          onChange={(e) => setParLevel(item.id, parseInt(e.target.value) || 0)}
                          style={{ width: "44px", padding: "4px 6px", textAlign: "center", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-md)", backgroundColor: "var(--jood-ground)", color: "var(--jood-ink-muted)", fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}
                          title="Par level (minimum stock)"
                        />
                        <span style={{ fontFamily: "var(--font-label)", fontSize: "7px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--jood-ink-subtle)" }}>min</span>
                      </div>

                      {/* Stepper */}
                      <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-md)", overflow: "hidden", backgroundColor: "var(--jood-ground)" }}>
                        <button
                          onClick={() => step(item.id, -1)}
                          style={{ width: "28px", height: "32px", border: "none", background: "none", cursor: "pointer", color: "var(--jood-ink-muted)", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 120ms" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--jood-surface)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                        >−</button>
                        <span style={{ minWidth: "32px", textAlign: "center", fontSize: "0.875rem", fontWeight: 500, color: STATUS_COLOR[status], fontVariantNumeric: "tabular-nums", padding: "0 4px", borderLeft: "1px solid var(--jood-line)", borderRight: "1px solid var(--jood-line)", lineHeight: "32px" }}>
                          {item.current_stock}
                        </span>
                        <button
                          onClick={() => step(item.id, 1)}
                          style={{ width: "28px", height: "32px", border: "none", background: "none", cursor: "pointer", color: "var(--jood-ink-muted)", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 120ms" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--jood-surface)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                        >+</button>
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteItem(item.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--jood-ink-subtle)", width: "28px", height: "28px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", transition: "color 120ms, background 120ms" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--jood-danger)"; e.currentTarget.style.background = "rgba(201,48,48,0.06)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--jood-ink-ghost)"; e.currentTarget.style.background = "none"; }}
                    ><X size={13} strokeWidth={1.75} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Add item form */}
      {adding ? (
        <div style={{ backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)", padding: "18px 20px", marginBottom: "10px" }}>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "14px" }}>New item</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: "10px", marginBottom: "12px" }}>
            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--jood-ink-muted)", display: "block", marginBottom: "4px" }}>Category</label>
              <select value={newItem.category} onChange={(e) => setNewItem((n) => ({ ...n, category: e.target.value }))} style={{ ...inputStyle, textTransform: "capitalize" }}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c]?.label ?? c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--jood-ink-muted)", display: "block", marginBottom: "4px" }}>Name</label>
              <input value={newItem.name} onChange={(e) => setNewItem((n) => ({ ...n, name: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addItem()} style={inputStyle} placeholder="e.g. Bath towel" autoFocus />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--jood-ink-muted)", display: "block", marginBottom: "4px" }}>Unit</label>
              <input value={newItem.unit} onChange={(e) => setNewItem((n) => ({ ...n, unit: e.target.value }))} style={inputStyle} placeholder="pcs, sets, bottles…" />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--jood-ink-muted)", display: "block", marginBottom: "4px" }}>Starting stock</label>
              <input type="number" value={newItem.current_stock} min={0} onChange={(e) => setNewItem((n) => ({ ...n, current_stock: parseInt(e.target.value) || 0 }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--jood-ink-muted)", display: "block", marginBottom: "4px" }}>Keep at least (par)</label>
              <input type="number" value={newItem.par_level} min={0} onChange={(e) => setNewItem((n) => ({ ...n, par_level: parseInt(e.target.value) || 0 }))} style={inputStyle} />
            </div>
          </div>
          {addError && <p role="alert" style={{ color: "var(--jood-danger)", fontSize: "0.8125rem", marginBottom: "10px" }}>{addError}</p>}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={addItem} disabled={addingPending || !newItem.name.trim()} style={{ padding: "8px 20px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.8125rem", cursor: "pointer", opacity: addingPending || !newItem.name.trim() ? 0.4 : 1 }}>
              {addingPending ? "Adding…" : "Add item"}
            </button>
            <button onClick={() => setAdding(false)} style={{ padding: "8px 16px", backgroundColor: "transparent", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", fontSize: "0.8125rem", cursor: "pointer", color: "var(--jood-ink-muted)" }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{ width: "100%", padding: "14px", backgroundColor: "transparent", border: "1.5px dashed var(--jood-line)", borderRadius: "var(--radius-lg)", fontSize: "0.875rem", cursor: "pointer", color: "var(--jood-ink-subtle)", transition: "border-color 150ms, color 150ms" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--jood-ink-muted)"; e.currentTarget.style.color = "var(--jood-ink-muted)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--jood-line)"; e.currentTarget.style.color = "var(--jood-ink-ghost)"; }}
        >
          + Add item
        </button>
      )}
    </div>
  );
}
