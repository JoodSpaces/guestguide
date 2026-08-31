"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "@/components/admin/Toaster";
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

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

interface Props {
  task: TurnoverTask;
  items: TurnoverItem[];
  teamMembers: TeamMember[];
  myRole?: string;
  myName?: string;
}

// Plain-English status for staff
const STATUS_LABEL: Record<string, string> = {
  scheduled: "Upcoming",
  pending:   "Ready to start",
  in_progress: "Cleaning in progress",
  ready:     "Done — waiting for approval",
  approved:  "Approved ✓",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "var(--jood-aqua)",
  pending:   "var(--jood-ink-muted)",
  in_progress: "var(--jood-accent)",
  ready:     "var(--jood-success)",
  approved:  "var(--jood-aqua)",
};

const CONDITION_COLORS: Record<string, string> = {
  excellent: "var(--jood-success)",
  good:      "var(--jood-success)",
  fair:      "var(--jood-accent)",
  damaged:   "var(--jood-danger)",
};

const DAMAGE_COLORS: Record<string, string> = {
  damaged:        "var(--jood-danger)",
  missing:        "var(--jood-accent)",
  needs_cleaning: "var(--jood-aqua)",
};

const DAMAGE_LABEL: Record<string, string> = {
  missing:        "Missing",
  damaged:        "Broken / damaged",
  needs_cleaning: "Needs cleaning",
};

// Room emoji icons for easy recognition
const ROOM_EMOJI: Record<string, string> = {
  bedroom:  "🛏",
  bathroom: "🚿",
  kitchen:  "🍳",
  living:   "🛋",
  outdoor:  "🌿",
  general:  "✅",
};

const card: React.CSSProperties = {
  backgroundColor: "var(--jood-surface)",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-lg)",
  padding: "16px 20px",
  marginBottom: "12px",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function TurnoverClient({ task: initialTask, items: initialItems, teamMembers, myRole = "ops", myName = "" }: Props) {
  const [task, setTask]         = useState(initialTask);
  const [items, setItems]       = useState(initialItems);
  const [savingStatus, setSavingStatus] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [approvedBy, setApprovedBy]     = useState("");
  const [assessNotes, setAssessNotes]   = useState(task.notes ?? "");
  const [damageNotes, setDamageNotes]   = useState(task.damage_notes ?? "");
  const [condition, setCondition]       = useState<string>(task.condition ?? "good");
  const [savingAssess, setSavingAssess] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Inventory damage state
  const [damageRecords, setDamageRecords]     = useState<DamageRecord[]>([]);
  const [inventoryItems, setInventoryItems]   = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId]   = useState("");
  const [damageQty, setDamageQty]             = useState(1);
  const [damageCondition, setDamageCondition] = useState<"damaged" | "missing" | "needs_cleaning">("missing");
  const [damageItemNote, setDamageItemNote]   = useState("");
  const [addingDamage, setAddingDamage]       = useState(false);
  const [removingDamageId, setRemovingDamageId] = useState<string | null>(null);
  const [reportOpen, setReportOpen]           = useState(false);
  const [assignTo, setAssignTo]               = useState(task.assigned_to ?? "");
  const [savingAssign, setSavingAssign]       = useState(false);

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
      toast("Item reported");
    }
  }

  async function removeDamageItem(id: string) {
    setRemovingDamageId(id);
    await fetch(`/api/admin/ops/turnover/${task.id}/damage?damageId=${id}`, { method: "DELETE" });
    setDamageRecords((prev) => prev.filter((r) => r.id !== id));
    setRemovingDamageId(null);
  }

  const grouped      = items.reduce<Record<string, TurnoverItem[]>>((acc, item) => {
    (acc[item.room] ??= []).push(item);
    return acc;
  }, {});
  const totalItems   = items.length;
  const checkedItems = items.filter((i) => i.checked).length;
  const progress     = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
  const allDone      = checkedItems === totalItems && totalItems > 0;

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
    if (res.ok) {
      setTask((t) => ({ ...t, status: status as TurnoverTask["status"] }));
      const labels: Record<string, string> = {
        in_progress: "Started",
        ready:       "Marked as done",
        approved:    "Approved ✓",
      };
      toast(labels[status] ?? "Updated");
    } else {
      toast("Failed to update", "error");
    }
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

  async function saveAssign(name: string) {
    setSavingAssign(true);
    const res = await fetch(`/api/admin/ops/turnover/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to: name || null }),
    });
    setSavingAssign(false);
    if (res.ok) {
      setTask((t) => ({ ...t, assigned_to: name || null }));
      toast(name ? `Assigned to ${name}` : "Unassigned");
    } else {
      toast("Failed to assign", "error");
    }
  }

  async function saveAssessment() {
    setSavingAssess(true);
    const res = await fetch(`/api/admin/ops/turnover/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: assessNotes || null,
        condition,
        damage_notes: damageNotes || null,
      }),
    });
    setSavingAssess(false);
    if (res.ok) {
      setTask((t) => ({ ...t, notes: assessNotes, condition: condition as TurnoverTask["condition"], damage_notes: damageNotes }));
      toast("Assessment saved");
    } else {
      toast("Failed to save", "error");
    }
  }

  const statusColor = STATUS_COLORS[task.status] ?? "var(--jood-ink-muted)";

  return (
    <div style={{ maxWidth: "680px" }}>
      {/* Back */}
      <a href="/admin/ops" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--jood-ink-muted)", textDecoration: "none", fontSize: "0.875rem", marginBottom: "20px" }}>
        ← Back to Operations
      </a>

      {/* Header */}
      <div style={{ ...card, marginBottom: "16px", borderLeft: `4px solid ${statusColor}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <div>
            <p style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "4px" }}>{task.properties.name}</p>
            {task.bookings && (
              <p style={{ fontSize: "0.875rem", color: "var(--jood-ink-muted)", marginBottom: "4px" }}>
                Guest: {task.bookings.guest_first_name} {task.bookings.guest_last_name} · checkout {fmtDate(task.bookings.check_out)}
              </p>
            )}
            {/* Assignment UI — manager sees dropdown, ops sees claim/status */}
            {myRole === "admin" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", flexShrink: 0 }}>👤 Assigned to:</span>
                <select
                  value={assignTo}
                  onChange={(e) => { setAssignTo(e.target.value); saveAssign(e.target.value); }}
                  disabled={savingAssign}
                  style={{
                    padding: "6px 10px",
                    border: "1px solid var(--jood-line)",
                    borderRadius: "var(--radius-pill)",
                    backgroundColor: "var(--jood-ground)",
                    fontSize: "0.875rem",
                    color: assignTo ? "var(--jood-ink)" : "var(--jood-ink-ghost)",
                    cursor: "pointer",
                    opacity: savingAssign ? 0.5 : 1,
                    fontFamily: "inherit",
                  }}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
                {savingAssign && <span style={{ fontSize: "0.75rem", color: "var(--jood-ink-ghost)" }}>saving…</span>}
              </div>
            ) : task.assigned_to === null ? (
              <div style={{ marginTop: "10px" }}>
                <button
                  onClick={() => { setAssignTo(myName); saveAssign(myName); }}
                  disabled={savingAssign || !myName}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)",
                    border: "none", borderRadius: "var(--radius-pill)",
                    fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer",
                    opacity: savingAssign ? 0.5 : 1,
                  }}
                >
                  {savingAssign ? "Claiming…" : "🙋 Claim this task"}
                </button>
              </div>
            ) : task.assigned_to === myName ? (
              <p style={{ fontSize: "0.875rem", color: "var(--jood-aqua)", marginTop: "8px", fontWeight: 500 }}>
                👤 You're on this task
              </p>
            ) : (
              <p style={{ fontSize: "0.875rem", color: "var(--jood-ink-muted)", marginTop: "8px" }}>
                👤 Assigned to {task.assigned_to}
              </p>
            )}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontFamily: "var(--font-label)", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: statusColor, marginBottom: "2px" }}>
              Status
            </p>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: statusColor }}>
              {STATUS_LABEL[task.status]}
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ ...card, padding: "14px 20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "0.9375rem", fontWeight: 600 }}>
            {checkedItems} of {totalItems} tasks done
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: allDone ? "var(--jood-success)" : "var(--jood-accent)", fontWeight: 600 }}>{progress}%</span>
        </div>
        <div style={{ height: "6px", backgroundColor: "var(--jood-line)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, backgroundColor: allDone ? "var(--jood-success)" : "var(--jood-accent)", transition: "width 300ms ease", borderRadius: "3px" }} />
        </div>
        {allDone && (
          <p style={{ fontSize: "0.8125rem", color: "var(--jood-success)", marginTop: "8px", fontWeight: 500 }}>
            ✓ All tasks complete — you can now mark this as done
          </p>
        )}
      </div>

      {/* ── MAIN ACTION — prominent, always visible ── */}
      {(task.status === "pending" || task.status === "scheduled") && (
        <button
          onClick={() => updateStatus("in_progress")}
          disabled={savingStatus}
          style={{
            display: "block", width: "100%",
            padding: "16px 24px",
            backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)",
            border: "none", borderRadius: "var(--radius-lg)",
            fontSize: "1.0625rem", fontWeight: 600, cursor: "pointer",
            marginBottom: "16px", opacity: savingStatus ? 0.5 : 1,
          }}
        >
          🧹 Start cleaning
        </button>
      )}

      {task.status === "in_progress" && (
        <button
          onClick={() => updateStatus("ready")}
          disabled={savingStatus || !allDone}
          style={{
            display: "block", width: "100%",
            padding: "16px 24px",
            backgroundColor: allDone ? "var(--jood-success)" : "var(--jood-line)",
            color: allDone ? "white" : "var(--jood-ink-muted)",
            border: "none", borderRadius: "var(--radius-lg)",
            fontSize: "1.0625rem", fontWeight: 600,
            cursor: allDone ? "pointer" : "not-allowed",
            marginBottom: "16px", opacity: savingStatus ? 0.5 : 1,
          }}
        >
          {allDone ? "✓ I'm done — notify supervisor" : `Finish all tasks first (${progress}%)`}
        </button>
      )}

      {task.status === "ready" && (
        <div style={{ ...card, backgroundColor: "var(--jood-surface-raised)", marginBottom: "16px" }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 500, marginBottom: "10px", color: "var(--jood-success)" }}>
            ✓ Cleaning done — supervisor approval needed
          </p>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              placeholder="Supervisor name"
              style={{ flex: 1, minWidth: "140px", padding: "10px 12px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-md)", backgroundColor: "var(--jood-ground)", fontSize: "0.9375rem", color: "var(--jood-ink)" }}
            />
            <button
              onClick={() => updateStatus("approved")}
              disabled={savingStatus || !approvedBy}
              style={{
                padding: "10px 24px",
                backgroundColor: approvedBy ? "var(--jood-ink)" : "var(--jood-line)",
                color: approvedBy ? "var(--jood-ground)" : "var(--jood-ink-muted)",
                border: "none", borderRadius: "var(--radius-pill)",
                fontSize: "0.9375rem", fontWeight: 600, cursor: approvedBy ? "pointer" : "not-allowed",
                opacity: savingStatus ? 0.5 : 1,
              }}
            >
              Approve ✓
            </button>
          </div>
        </div>
      )}

      {task.status === "approved" && (
        <div style={{ ...card, marginBottom: "16px", backgroundColor: "rgba(var(--jood-success-rgb, 40,167,69), 0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.5rem" }}>✅</span>
            <div>
              <p style={{ fontWeight: 600, color: "var(--jood-success)", marginBottom: "2px" }}>Approved</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>By {task.approved_by} · {task.approved_at ? fmt(task.approved_at) : ""}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── CHECKLIST by room ── */}
      {Object.entries(grouped).map(([room, roomItems]) => {
        const roomChecked = roomItems.filter((i) => i.checked).length;
        const roomDone    = roomChecked === roomItems.length;
        return (
          <div key={room} style={{ ...card }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--jood-ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>{ROOM_EMOJI[room] ?? "🏠"}</span>
                {ROOM_LABELS[room] ?? room}
              </span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "0.8125rem",
                color: roomDone ? "var(--jood-success)" : "var(--jood-ink-muted)",
                fontWeight: roomDone ? 600 : 400,
              }}>
                {roomChecked}/{roomItems.length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {roomItems.map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 0", borderBottom: "1px solid var(--jood-line)" }}>
                  {/* Large tap-friendly checkbox */}
                  <button
                    onClick={() => toggleItem(item.id, !item.checked)}
                    style={{
                      flexShrink: 0,
                      width: "44px", height: "44px",
                      borderRadius: "10px",
                      border: `2px solid ${item.checked ? "var(--jood-success)" : "var(--jood-line)"}`,
                      backgroundColor: item.checked ? "var(--jood-success)" : "transparent",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontSize: "20px",
                      transition: "all 150ms",
                    }}
                    aria-label={item.checked ? "Uncheck" : "Check"}
                  >
                    {item.checked ? "✓" : ""}
                  </button>

                  {/* Label */}
                  <span style={{ flex: 1, fontSize: "0.9375rem", color: item.checked ? "var(--jood-ink-muted)" : "var(--jood-ink)", textDecoration: item.checked ? "line-through" : "none", lineHeight: 1.4 }}>
                    {item.label}
                  </span>

                  {/* Photo */}
                  <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    {item.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a href={item.photo_url} target="_blank" rel="noopener noreferrer">
                        <img src={item.photo_url} alt="" style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--jood-line)" }} />
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
                      style={{
                        background: "none", border: "1px solid var(--jood-line)", borderRadius: "8px",
                        padding: "8px", cursor: "pointer", fontSize: "18px",
                        color: item.photo_url ? "var(--jood-accent)" : "var(--jood-ink-muted)",
                        width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      title="Add photo proof"
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

      {/* ── REPORT MISSING / DAMAGED ITEMS ── */}
      <div style={{ ...card, borderColor: damageRecords.length > 0 ? "var(--jood-accent)" : "var(--jood-line)" }}>
        <button
          onClick={() => setReportOpen((v) => !v)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.25rem" }}>⚠️</span>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--jood-ink)", marginBottom: "2px" }}>
                Report missing or damaged item
              </p>
              {damageRecords.length > 0 && (
                <p style={{ fontSize: "0.8125rem", color: "var(--jood-accent)" }}>
                  {damageRecords.length} item{damageRecords.length > 1 ? "s" : ""} reported
                </p>
              )}
            </div>
          </div>
          <span style={{ fontSize: "1rem", color: "var(--jood-ink-muted)", transform: reportOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }}>▾</span>
        </button>

        {reportOpen && (
          <div style={{ marginTop: "16px" }}>
            {/* Existing damage records */}
            {damageRecords.length > 0 && (
              <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {damageRecords.map((r) => (
                  <div key={r.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    borderLeft: `3px solid ${DAMAGE_COLORS[r.condition] ?? "var(--jood-line)"}`,
                    backgroundColor: "var(--jood-ground)",
                    gap: "10px",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--jood-ink)", marginBottom: "2px" }}>
                        {r.inventory_items.name}
                        {r.quantity > 1 && <span style={{ color: "var(--jood-ink-muted)", fontWeight: 400 }}> ×{r.quantity}</span>}
                      </p>
                      <p style={{ fontSize: "0.8125rem", color: DAMAGE_COLORS[r.condition] ?? "var(--jood-ink-muted)" }}>
                        {DAMAGE_LABEL[r.condition] ?? r.condition}
                      </p>
                      {r.notes && <p style={{ fontSize: "0.75rem", color: "var(--jood-ink-ghost)", marginTop: "2px" }}>{r.notes}</p>}
                    </div>
                    <button
                      onClick={() => removeDamageItem(r.id)}
                      disabled={removingDamageId === r.id}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--jood-ink-ghost)", fontSize: "1.25rem", padding: "4px 8px", flexShrink: 0 }}
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
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginBottom: "6px" }}>What item?</p>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    style={{ width: "100%", padding: "11px 12px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-md)", backgroundColor: "var(--jood-ground)", fontSize: "0.9375rem", color: selectedItemId ? "var(--jood-ink)" : "var(--jood-ink-ghost)" }}
                  >
                    <option value="">Choose an item…</option>
                    {inventoryItems.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginBottom: "6px" }}>How many?</p>
                  <div style={{ display: "flex", gap: "0", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-md)", overflow: "hidden", width: "fit-content" }}>
                    <button
                      onClick={() => setDamageQty((q) => Math.max(1, q - 1))}
                      style={{ padding: "10px 18px", background: "var(--jood-surface)", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "var(--jood-ink)" }}
                    >−</button>
                    <span style={{ padding: "10px 20px", fontSize: "1rem", fontWeight: 600, color: "var(--jood-ink)", backgroundColor: "var(--jood-ground)", minWidth: "50px", textAlign: "center" }}>{damageQty}</span>
                    <button
                      onClick={() => setDamageQty((q) => Math.min(999, q + 1))}
                      style={{ padding: "10px 18px", background: "var(--jood-surface)", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "var(--jood-ink)" }}
                    >+</button>
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginBottom: "6px" }}>What happened?</p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {(["missing", "damaged", "needs_cleaning"] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => setDamageCondition(c)}
                        style={{
                          padding: "10px 16px",
                          borderRadius: "var(--radius-pill)",
                          border: `2px solid ${damageCondition === c ? DAMAGE_COLORS[c] : "var(--jood-line)"}`,
                          backgroundColor: damageCondition === c ? DAMAGE_COLORS[c] : "transparent",
                          color: damageCondition === c ? "white" : "var(--jood-ink-muted)",
                          fontSize: "0.875rem", cursor: "pointer",
                          fontWeight: damageCondition === c ? 600 : 400,
                          transition: "all 150ms",
                        }}
                      >
                        {DAMAGE_LABEL[c]}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  value={damageItemNote}
                  onChange={(e) => setDamageItemNote(e.target.value)}
                  placeholder="Add a note (optional)"
                  style={{ padding: "10px 12px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-md)", backgroundColor: "var(--jood-ground)", fontSize: "0.9375rem", color: "var(--jood-ink)" }}
                />

                <button
                  onClick={addDamageItem}
                  disabled={!selectedItemId || addingDamage}
                  style={{
                    padding: "12px 24px",
                    backgroundColor: selectedItemId ? "var(--jood-ink)" : "var(--jood-line)",
                    color: selectedItemId ? "var(--jood-ground)" : "var(--jood-ink-muted)",
                    border: "none", borderRadius: "var(--radius-pill)",
                    fontSize: "0.9375rem", fontWeight: 600,
                    cursor: selectedItemId ? "pointer" : "not-allowed",
                    opacity: addingDamage ? 0.5 : 1,
                  }}
                >
                  {addingDamage ? "Reporting…" : "⚠️ Report this item"}
                </button>
              </div>
            ) : (
              <p style={{ fontSize: "0.875rem", color: "var(--jood-ink-ghost)" }}>
                No inventory set up for this property.{" "}
                <a href="/admin/ops" style={{ color: "var(--jood-accent)" }}>Go to Ops → Inventory</a>.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── SUPERVISOR SECTION ── (condition + notes, clearly labeled as supervisor work) */}
      <div style={{ ...card, backgroundColor: "var(--jood-surface-raised)", opacity: 0.9 }}>
        <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-ink-ghost)", marginBottom: "4px" }}>
          For supervisor
        </p>
        <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--jood-ink)", marginBottom: "14px" }}>Unit Condition & Notes</p>

        <div style={{ marginBottom: "14px" }}>
          <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginBottom: "8px" }}>Overall condition</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(["excellent", "good", "fair", "damaged"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCondition(c)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-pill)",
                  border: `2px solid ${condition === c ? CONDITION_COLORS[c] : "var(--jood-line)"}`,
                  backgroundColor: condition === c ? CONDITION_COLORS[c] : "transparent",
                  color: condition === c ? "white" : "var(--jood-ink-muted)",
                  fontSize: "0.875rem", cursor: "pointer",
                  fontWeight: condition === c ? 600 : 400,
                  textTransform: "capitalize",
                  transition: "all 150ms",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {condition === "damaged" && (
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginBottom: "5px" }}>Describe the damage</label>
            <textarea
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              placeholder="Describe damage..."
              style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--jood-danger)", borderRadius: "var(--radius-md)", backgroundColor: "var(--jood-ground)", fontSize: "0.875rem", resize: "vertical", minHeight: "70px", boxSizing: "border-box", color: "var(--jood-ink)" }}
            />
          </div>
        )}

        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginBottom: "5px" }}>Notes (optional)</label>
          <textarea
            value={assessNotes}
            onChange={(e) => setAssessNotes(e.target.value)}
            placeholder="Any notes for the supervisor..."
            style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-md)", backgroundColor: "var(--jood-ground)", fontSize: "0.875rem", resize: "vertical", minHeight: "60px", boxSizing: "border-box", color: "var(--jood-ink)" }}
          />
        </div>

        <button
          onClick={saveAssessment}
          disabled={savingAssess}
          style={{ padding: "10px 20px", backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: "pointer", opacity: savingAssess ? 0.5 : 1, fontWeight: 500 }}
        >
          {savingAssess ? "Saving…" : "Save notes"}
        </button>
      </div>
    </div>
  );
}
