"use client";

import { useState, useRef, useCallback } from "react";
import { BedDouble, Boxes, ChevronRight, Droplets, Utensils, Leaf, Package, PackageCheck, PackageX, Plus, TriangleAlert, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { DetailHead } from "@/components/app/ui";
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
  const [cat, setCat]                   = useState<string>("all");
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

  // How healthy the stock is: of the items that have a minimum, how many are at or above it.
  const watched = items.filter((i) => i.par_level > 0);
  const okCount = watched.filter((i) => i.current_stock >= i.par_level).length;
  const pct = watched.length ? Math.round((okCount / watched.length) * 100) : null;
  const verdict = pct === null ? { text: "Set a minimum on each item", tone: "neutral" as const }
    : outOfStock.length > 0 ? { text: "Restock now", tone: "danger" as const }
    : lowStock.length > 0 ? { text: "Needs attention", tone: "warn" as const }
    : { text: "Well stocked", tone: "ok" as const };
  const ringColor = verdict.tone === "danger" ? "var(--jood-danger)" : verdict.tone === "warn" ? "var(--jood-accent)" : "var(--jood-success)";
  const R = 52, C = 2 * Math.PI * R;

  const shown = cat === "all" ? items : items.filter((i) => i.category === cat);
  const present = CATEGORIES.filter((c) => grouped[c]?.length);

  return (
    <div style={{ maxWidth: "700px" }}>
      <DetailHead back="/admin/ops" title="Inventory" />

      <p style={{ margin: "0 2px 12px", fontSize: "0.85rem", color: "var(--jood-mid)" }}>Stock in</p>
      <h1 style={{ margin: "-10px 2px 18px" }}>{propertyName}</h1>

      {/* Stock health: a ring, and what it says */}
      <section className="inv-health">
        <div className="inv-verdict"><span>Stock status</span><b className={verdict.tone}>{verdict.text}</b></div>
        <div className="inv-ring">
          <svg viewBox="0 0 120 120" width="150" height="150" aria-hidden>
            <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(53,30,28,.09)" strokeWidth="10" />
            {pct !== null && (
              <circle cx="60" cy="60" r={R} fill="none" stroke={ringColor} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(C * pct) / 100} ${C}`} transform="rotate(-90 60 60)" style={{ transition: "stroke-dasharray 600ms ease" }} />
            )}
          </svg>
          <div><b>{pct === null ? "–" : `${pct}%`}</b><small>at or above minimum</small></div>
        </div>
        <div className="inv-tiles">
          <div><span className="ic danger"><PackageX size={18} strokeWidth={1.8} /></span><b>{outOfStock.length}</b><small>Out of stock</small></div>
          <div><span className="ic warn"><TriangleAlert size={18} strokeWidth={1.8} /></span><b>{lowStock.length}</b><small>Running low</small></div>
          <div><span className="ic ok"><PackageCheck size={18} strokeWidth={1.8} /></span><b>{okCount}</b><small>Stocked</small></div>
          <div><span className="ic info"><Boxes size={18} strokeWidth={1.8} /></span><b>{items.length}</b><small>Tracked</small></div>
        </div>
      </section>

      {/* Add: the gradient card */}
      {adding ? (
        <div style={{ background: "var(--jood-surface)", borderRadius: 24, padding: "18px 18px 16px", margin: "14px 0" }}>
          <p style={{ fontWeight: 650, margin: "0 0 12px" }}>New item</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: "10px", marginBottom: "12px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "4px" }}>Category</label>
              <select value={newItem.category} onChange={(e) => setNewItem((n) => ({ ...n, category: e.target.value }))} style={{ ...inputStyle, textTransform: "capitalize" }}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c]?.label ?? c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px" }}>Name</label>
              <input value={newItem.name} onChange={(e) => setNewItem((n) => ({ ...n, name: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addItem()} style={inputStyle} placeholder="e.g. Bath towel" />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px" }}>Unit</label>
              <input value={newItem.unit} onChange={(e) => setNewItem((n) => ({ ...n, unit: e.target.value }))} style={inputStyle} placeholder="pcs, sets, bottles…" />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px" }}>Starting stock</label>
              <input type="number" value={newItem.current_stock} min={0} onChange={(e) => setNewItem((n) => ({ ...n, current_stock: parseInt(e.target.value) || 0 }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px" }}>Keep at least (par)</label>
              <input type="number" value={newItem.par_level} min={0} onChange={(e) => setNewItem((n) => ({ ...n, par_level: parseInt(e.target.value) || 0 }))} style={inputStyle} />
            </div>
          </div>
          {addError && <p role="alert" style={{ color: "var(--jood-danger)", fontSize: "0.8125rem", marginBottom: "10px" }}>{addError}</p>}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={addItem} disabled={addingPending || !newItem.name.trim()} className="btn btn-primary btn-sm">{addingPending ? "Adding…" : "Add item"}</button>
            <button onClick={() => setAdding(false)} className="btn btn-ghost btn-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="inv-cta">
          <span className="ic"><Plus size={20} strokeWidth={2} /></span>
          <span><b>Add an item</b><small>Track something new in this house</small></span>
          <ChevronRight size={18} strokeWidth={1.8} aria-hidden />
        </button>
      )}

      {/* Categories as pills */}
      {items.length > 0 && (
        <div className="inv-pills" role="tablist" aria-label="Category">
          <button type="button" role="tab" aria-selected={cat === "all"} onClick={() => setCat("all")}>All <span>{items.length}</span></button>
          {present.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={cat === c} onClick={() => setCat(c)}>
              {CATEGORY_META[c]?.label ?? c} <span>{grouped[c].length}</span>
            </button>
          ))}
        </div>
      )}

      {items.length === 0 && <p className="app-empty">Nothing is tracked in this house yet. Add the first item above.</p>}

      {/* Items as a grid of cards */}
      <div className="inv-grid">
        {shown.map((item) => {
          const status = stockStatus(item.current_stock, item.par_level);
          const meta = CATEGORY_META[item.category] ?? { label: item.category, icon: Package };
          const Icon = meta.icon;
          const gaugePct = item.par_level > 0 ? Math.min(1, item.current_stock / item.par_level) : null;
          const chip = status === "critical" ? { t: "Out", c: "danger" } : status === "low" ? { t: "Low", c: "warn" } : status === "ok" ? { t: "OK", c: "ok" } : { t: "No minimum", c: "neutral" };
          return (
            <article key={item.id} className="inv-card">
              <div className="inv-card-top">
                <span className="ic"><Icon size={16} strokeWidth={1.8} /></span>
                <span className={`app-state ${chip.c}`}>{chip.t}</span>
              </div>
              <b className="inv-name">{item.name}</b>
              <small className="inv-sub">
                {gaugePct !== null ? `${item.current_stock} of ${item.par_level} ${item.unit}` : `${item.current_stock} ${item.unit}`}
              </small>
              {gaugePct !== null && (
                <div className="inv-gauge"><i style={{ width: `${gaugePct * 100}%`, background: STATUS_COLOR[status] }} /></div>
              )}
              <div className="inv-step">
                <button type="button" onClick={() => step(item.id, -1)} aria-label={`One less ${item.name}`}>−</button>
                <span style={{ color: STATUS_COLOR[status] === "var(--jood-line)" ? "var(--jood-ink)" : STATUS_COLOR[status] }}>{item.current_stock}</span>
                <button type="button" onClick={() => step(item.id, 1)} aria-label={`One more ${item.name}`}>+</button>
              </div>
              <div className="inv-foot">
                <label>
                  Min
                  <input type="number" value={item.par_level} min={0} onChange={(e) => setParLevel(item.id, parseInt(e.target.value) || 0)} title="Par level (minimum stock)" />
                </label>
                <button type="button" onClick={() => deleteItem(item.id)} aria-label={`Remove ${item.name}`}><X size={14} strokeWidth={1.8} /></button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
