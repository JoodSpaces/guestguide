"use client";

import { useState, useRef, useEffect } from "react";
import { ROOM_LABELS } from "@/lib/ops-checklist";

export interface TurnoverItem {
  id: string;
  room: string;
  label: string;
  checked: boolean;
  checked_at: string | null;
  photo_url: string | null;
  notes: string | null;
  sort_order: number;
}

export interface TurnoverTask {
  id: string;
  status: "scheduled" | "pending" | "in_progress" | "ready" | "approved";
  assigned_to: string | null;
  notes: string | null;
  condition: "excellent" | "good" | "fair" | "damaged" | null;
  damage_notes: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  properties: { id: string; name: string };
  bookings: { id: string; check_in: string; check_out: string; guest_first_name: string; guest_last_name: string } | null;
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  category: string;
}

interface DamageRecord {
  id: string;
  item_id: string;
  quantity: number;
  condition: "damaged" | "missing" | "needs_cleaning";
  notes: string | null;
  created_at: string;
  inventory_items: { name: string; unit: string; category: string };
}

interface Props {
  task: TurnoverTask;
  items: TurnoverItem[];
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "var(--jood-aqua)",
  pending: "var(--jood-ink-muted)",
  in_progress: "var(--jood-warning)",
  ready: "var(--jood-success)",
  approved: "var(--jood-aqua)",
};

const CONDITION_COLORS: Record<string, string> = {
  excellent: "var(--jood-success)",
  good: "var(--jood-success)",
  fair: "var(--jood-warning)",
  damaged: "var(--jood-danger)",
};

const DAMAGE_COLORS: Record<string, string> = {
  damaged: "var(--jood-danger)",
  missing: "var(--jood-warning)",
  needs_cleaning: "var(--jood-aqua)",
};

const card: React.CSSProperties = {
  backgroundColor: "var(--jood-surface)",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-lg)",
  padding: "16px 20px",
  marginBottom: "10px",
};

const pill = (color: string): React.CSSProperties => ({
  display: "inline-block",
  fontFamily: "var(--font-label)",
  fontSize: "9px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color,
  border: `1px solid ${color}`,
  borderRadius: "var(--radius-pill)",
  padding: "3px 9px",
});

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function TurnoverClient({ task: initialTask, items: initialItems }: Props) {
  const [task, setTask] = useState(initialTask);
  const [items, setItems] = useState(initialItems);
  const [savingStatus, setSavingStatus] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [approvedBy, setApprovedBy] = useState("");
  const [assessNotes, setAssessNotes] = useState(task.notes ?? "");
  const [damageNotes, setDamageNotes] = useState(task.damage_notes ?? "");
  const [condition, setCondition] = useState<string>(task.condition ?? "good");
  const [savingAssess, setSavingAssess] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Inventory damage state
  const [damageRecords, setDamageRecords] = useState<DamageRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [damageQty, setDamageQty] = useState(1);
  const [damageCondition, setDamageCondition] = useState<"damaged" | "missing" | "needs_cleaning">("missing");
  const [damageItemNote, setDamageItemNote] = useState("");
  const [addingDamage, setAddingDamage] = useState(false);
  const [removingDamageId, setRemovingDamageId] = useState<string | null>(null);

  const propertyId = task.properties.id;

  useEffect(() => {
    fetch(`/api/admin/ops/inventory/${propertyId}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: InventoryItem[]) => setInventoryItems(data))
      .catch(() => {});
    fetch(`/api/admin/ops/turnover/${task.id}/damage`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: DamageRecord[]) => setDamageRecords(data))
      .catch(() => {});
  }, [propertyId, task.id]);

  async function addDamageItem() {
    if (!selectedItemId) return;
    setAddingDamage(true);
    const res = await fetch(`/api/admin/ops/turnover/${task.id}/damage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: selectedItemId,
        quantity: damageQty,
        condition: damageCondition,
        notes: damageItemNote || null,
      }),
    });
    setAddingDamage(false);
    if (res.ok) {
      const record: DamageRecord = await res.json();
      setDamageRecords((prev) => [...prev, record]);
      setSelectedItemId("");
      setDamageQty(1);
      setDamageItemNote("");
    }
  }

  async function removeDamageItem(id: string) {
    setRemovingDamageId(id);
    await fetch(`/api/admin/ops/turnover/${task.id}/damage?damageId=${id}`, { method: "DELETE" });
    setDamageRecords((prev) => prev.filter((r) => r.id !== id));
    setRemovingDamageId(null);
  }

  const grouped = items.reduce<Record<string, TurnoverItem[]>>((acc, item) => {
    (acc[item.room] ??= []).push(item);
    return acc;
  }, {});

  const totalItems = items.length;
  const checkedItems = items.filter((i) => i.checked).length;
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  async function toggleItem(itemId: string, checked: boolean) {
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, checked, checked_at: checked ? new Date().toISOString() : null } : i));
    await fetch(`/api/admin/ops/turnover/${task.id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked }),
    });
    if (task.status === "pending" || task.status === "scheduled") {
      await updateStatus("in_progress");
    }
  }

  async function updateStatus(status: string) {
    setSavingStatus(true);
    const body: Record<string, unknown> = { status };
    if (status === "approved" && approvedBy) body.approved_by = approvedBy;
    const res = await fetch(`/api/admin/ops/turnover/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSavingStatus(false);
    if (res.ok) setTask((t) => ({ ...t, status: status as TurnoverTask["status"] }));
  }

  async function uploadPhoto(itemId: string, file: File) {
    setUploadingFor(itemId);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/ops/upload", { method: "POST", body: fd });
    setUploadingFor(null);
    if (!res.ok) { alert("Upload failed"); return; }
    const { url } = await res.json();
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, photo_url: url } : i));
    await fetch(`/api/admin/ops/turnover/${task.id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_url: url }),
    });
  }

  async function saveAssessment() {
    setSavingAssess(true);
    await fetch(`/api/admin/ops/turnover/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: assessNotes || null,
        condition,
        damage_notes: damageNotes || null,
      }),
    });
    setSavingAssess(false);
    setTask((t) => ({ ...t, notes: assessNotes, condition: condition as TurnoverTask["condition"], damage_notes: damageNotes }));
  }

  return (
    <div style={{ maxWidth: "680px" }}>
      {/* Back */}
      <a href="/admin/ops" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--jood-ink-muted)", textDecoration: "none", fontSize: "0.8125rem", marginBottom: "20px" }}>
        ← Ops
      </a>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "6px" }}>
            Turnover · {task.properties.name}
          </p>
          {task.bookings && (
            <p style={{ fontSize: "0.875rem", color: "var(--jood-ink-muted)", marginBottom: "4px" }}>
              {task.bookings.guest_first_name} {task.bookings.guest_last_name} · checkout {new Date(task.bookings.check_out).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </p>
          )}
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--jood-ink-ghost)" }}>Created {fmt(task.created_at)}</p>
        </div>
        <span style={pill(STATUS_COLORS[task.status] ?? "var(--jood-ink-muted)")}>{task.status.replace("_", " ")}</span>
      </div>

      {/* Progress bar */}
      <div style={{ ...card, padding: "14px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{checkedItems} / {totalItems} items</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--jood-accent)" }}>{progress}%</span>
        </div>
        <div style={{ height: "4px", backgroundColor: "var(--jood-line)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, backgroundColor: progress === 100 ? "var(--jood-success)" : "var(--jood-accent)", transition: "width 300ms var(--ease-standard)", borderRadius: "2px" }} />
        </div>
      </div>

      {/* Checklist by room */}
      {Object.entries(grouped).map(([room, roomItems]) => {
        const roomChecked = roomItems.filter((i) => i.checked).length;
        return (
          <div key={room} style={{ ...card }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-accent)", backgroundColor: "rgba(255,96,55,0.08)", borderRadius: "var(--radius-pill)", padding: "3px 9px" }}>
                {ROOM_LABELS[room] ?? room}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: roomChecked === roomItems.length ? "var(--jood-success)" : "var(--jood-ink-muted)" }}>
                {roomChecked}/{roomItems.length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {roomItems.map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid var(--jood-line)" }}>
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleItem(item.id, !item.checked)}
                    style={{
                      flexShrink: 0,
                      width: "24px", height: "24px",
                      borderRadius: "6px",
                      border: `2px solid ${item.checked ? "var(--jood-success)" : "var(--jood-line)"}`,
                      backgroundColor: item.checked ? "var(--jood-success)" : "transparent",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontSize: "13px",
                      transition: "all 150ms",
                    }}
                  >
                    {item.checked ? "✓" : ""}
                  </button>

                  {/* Label */}
                  <span style={{ flex: 1, fontSize: "0.875rem", color: item.checked ? "var(--jood-ink-muted)" : "var(--jood-ink)", textDecoration: item.checked ? "line-through" : "none" }}>
                    {item.label}
                  </span>

                  {/* Photo */}
                  <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    {item.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a href={item.photo_url} target="_blank" rel="noopener noreferrer">
                        <img src={item.photo_url} alt="" style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--jood-line)" }} />
                      </a>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: "none" }}
                      ref={(el) => { fileRefs.current[item.id] = el; }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(item.id, f); }}
                    />
                    <button
                      onClick={() => fileRefs.current[item.id]?.click()}
                      disabled={uploadingFor === item.id}
                      style={{ background: "none", border: "1px solid var(--jood-line)", borderRadius: "6px", padding: "4px 6px", cursor: "pointer", fontSize: "14px", color: "var(--jood-ink-muted)" }}
                      title="Add photo"
                    >
                      {uploadingFor === item.id ? "⏳" : "📷"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Missing / Damaged Items (inventory) */}
      <div style={{ ...card, borderColor: damageRecords.length > 0 ? "var(--jood-danger)" : "var(--jood-line)" }}>
        <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "14px" }}>
          Missing / Damaged Items
        </p>

        {/* Existing damage records */}
        {damageRecords.length > 0 && (
          <div style={{ marginBottom: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
            {damageRecords.map((r) => (
              <div key={r.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                borderLeft: `3px solid ${DAMAGE_COLORS[r.condition] ?? "var(--jood-line)"}`,
                backgroundColor: "var(--jood-ground)",
                gap: "10px",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--jood-ink)" }}>
                    {r.inventory_items.name}
                  </span>
                  <span style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginLeft: "8px" }}>
                    ×{r.quantity} {r.inventory_items.unit}
                  </span>
                  <span style={{
                    marginLeft: "8px",
                    fontFamily: "var(--font-label)", fontSize: "8px", letterSpacing: "0.1em",
                    textTransform: "uppercase", color: DAMAGE_COLORS[r.condition] ?? "var(--jood-ink-muted)",
                  }}>
                    {r.condition.replace("_", " ")}
                  </span>
                  {r.notes && <p style={{ fontSize: "0.75rem", color: "var(--jood-ink-ghost)", marginTop: "2px" }}>{r.notes}</p>}
                </div>
                <button
                  onClick={() => removeDamageItem(r.id)}
                  disabled={removingDamageId === r.id}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--jood-ink-ghost)", fontSize: "1rem", padding: "2px 6px", flexShrink: 0 }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        {inventoryItems.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                style={{ flex: 2, minWidth: "140px", padding: "8px 10px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-md)", backgroundColor: "var(--jood-ground)", fontSize: "0.875rem", color: selectedItemId ? "var(--jood-ink)" : "var(--jood-ink-ghost)" }}
              >
                <option value="">Select item…</option>
                {inventoryItems.map((i) => (
                  <option key={i.id} value={i.id}>{i.name} ({i.category})</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={999}
                value={damageQty}
                onChange={(e) => setDamageQty(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: "60px", padding: "8px 10px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-md)", backgroundColor: "var(--jood-ground)", fontSize: "0.875rem", color: "var(--jood-ink)", textAlign: "center" }}
              />
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {(["missing", "damaged", "needs_cleaning"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setDamageCondition(c)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "var(--radius-pill)",
                    border: `1px solid ${damageCondition === c ? DAMAGE_COLORS[c] : "var(--jood-line)"}`,
                    backgroundColor: "transparent",
                    color: damageCondition === c ? DAMAGE_COLORS[c] : "var(--jood-ink-muted)",
                    fontSize: "0.75rem", cursor: "pointer",
                    fontFamily: "var(--font-label)", letterSpacing: "0.06em", textTransform: "capitalize",
                  }}
                >
                  {c.replace("_", " ")}
                </button>
              ))}
            </div>
            <input
              value={damageItemNote}
              onChange={(e) => setDamageItemNote(e.target.value)}
              placeholder="Note (optional)"
              style={{ padding: "8px 10px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-md)", backgroundColor: "var(--jood-ground)", fontSize: "0.875rem", color: "var(--jood-ink)" }}
            />
            <button
              onClick={addDamageItem}
              disabled={!selectedItemId || addingDamage}
              style={{
                alignSelf: "flex-start",
                padding: "8px 18px",
                backgroundColor: selectedItemId ? "var(--jood-danger)" : "var(--jood-line)",
                color: selectedItemId ? "white" : "var(--jood-ink-muted)",
                border: "none", borderRadius: "var(--radius-pill)",
                fontSize: "0.8125rem", cursor: selectedItemId ? "pointer" : "not-allowed",
                opacity: addingDamage ? 0.5 : 1,
              }}
            >
              {addingDamage ? "Logging…" : "+ Log item"}
            </button>
          </div>
        ) : (
          <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-ghost)" }}>
            No inventory items set up for this property yet.{" "}
            <a href="/admin/ops" style={{ color: "var(--jood-accent)" }}>Go to Ops → Inventory</a> to add items.
          </p>
        )}
      </div>

      {/* Unit Assessment */}
      <div style={{ ...card, backgroundColor: "var(--jood-surface-raised)" }}>
        <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "14px" }}>Unit Assessment</p>

        <div style={{ marginBottom: "12px" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "8px" }}>Condition</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(["excellent", "good", "fair", "damaged"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCondition(c)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-pill)",
                  border: `1px solid ${condition === c ? CONDITION_COLORS[c] : "var(--jood-line)"}`,
                  backgroundColor: "transparent",
                  color: condition === c ? CONDITION_COLORS[c] : "var(--jood-ink-muted)",
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  fontFamily: "var(--font-label)",
                  letterSpacing: "0.06em",
                  textTransform: "capitalize",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {condition === "damaged" && (
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px" }}>Damage description</label>
            <textarea
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              placeholder="Describe damage..."
              style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--jood-danger)", borderRadius: "var(--radius-md)", backgroundColor: "var(--jood-ground)", fontSize: "0.875rem", resize: "vertical", minHeight: "70px", boxSizing: "border-box", color: "var(--jood-ink)" }}
            />
          </div>
        )}

        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px" }}>Notes (optional)</label>
          <textarea
            value={assessNotes}
            onChange={(e) => setAssessNotes(e.target.value)}
            placeholder="Any additional notes..."
            style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-md)", backgroundColor: "var(--jood-ground)", fontSize: "0.875rem", resize: "vertical", minHeight: "60px", boxSizing: "border-box", color: "var(--jood-ink)" }}
          />
        </div>

        <button onClick={saveAssessment} disabled={savingAssess} style={{ padding: "9px 18px", backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", fontSize: "0.8125rem", cursor: "pointer", opacity: savingAssess ? 0.5 : 1 }}>
          {savingAssess ? "Saving…" : "Save assessment"}
        </button>
      </div>

      {/* Status actions */}
      <div style={{ ...card, display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        {task.status === "scheduled" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: "10px" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--jood-aqua)" }}>
              Scheduled · checkout {task.bookings ? new Date(task.bookings.check_out).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
            </span>
            <button onClick={() => updateStatus("in_progress")} disabled={savingStatus} style={{ padding: "9px 18px", backgroundColor: "transparent", color: "var(--jood-ink-muted)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", fontSize: "0.8125rem", cursor: "pointer" }}>
              Start early
            </button>
          </div>
        )}
        {task.status === "pending" && (
          <button onClick={() => updateStatus("in_progress")} disabled={savingStatus} style={{ padding: "10px 20px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: "pointer", opacity: savingStatus ? 0.5 : 1 }}>
            Start cleaning
          </button>
        )}
        {task.status === "in_progress" && (
          <button onClick={() => updateStatus("ready")} disabled={savingStatus || progress < 100} style={{ padding: "10px 20px", backgroundColor: progress === 100 ? "var(--jood-success)" : "var(--jood-line)", color: progress === 100 ? "white" : "var(--jood-ink-muted)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: progress === 100 ? "pointer" : "not-allowed", opacity: savingStatus ? 0.5 : 1 }}>
            {progress < 100 ? `Complete all items first (${progress}%)` : "Mark ready for review"}
          </button>
        )}
        {task.status === "ready" && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", width: "100%" }}>
            <input
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              placeholder="Your name"
              style={{ flex: 1, minWidth: "140px", padding: "9px 12px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-md)", backgroundColor: "var(--jood-ground)", fontSize: "0.875rem", color: "var(--jood-ink)" }}
            />
            <button onClick={() => updateStatus("approved")} disabled={savingStatus || !approvedBy} style={{ padding: "10px 20px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: "pointer", opacity: savingStatus || !approvedBy ? 0.5 : 1 }}>
              Approve ✓
            </button>
          </div>
        )}
        {task.status === "approved" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--jood-success)", fontSize: "1.1rem" }}>✓</span>
            <span style={{ fontSize: "0.875rem", color: "var(--jood-ink-muted)" }}>Approved by {task.approved_by} · {task.approved_at ? fmt(task.approved_at) : ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}
