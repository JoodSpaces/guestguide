"use client";

import { useState } from "react";

interface Member {
  id: string;
  name: string;
  role: "admin" | "ops" | "concierge";
  is_active: boolean;
  created_at: string;
}

const ROLE_COLOR: Record<string, string> = {
  admin: "var(--jood-accent)",
  ops: "var(--jood-aqua)",
  concierge: "var(--jood-garnet)",
};

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

export function TeamClient({ initialMembers }: { initialMembers: Member[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", role: "ops" as Member["role"], password: "" });
  const [resetPass, setResetPass] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      setMembers((m) => [...m, created]);
      setAdding(false);
      setForm({ name: "", role: "ops", password: "" });
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `Error ${res.status}`);
    }
  }

  async function toggleActive(member: Member) {
    const res = await fetch(`/api/admin/team/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !member.is_active }),
    });
    if (res.ok) setMembers((m) => m.map((x) => x.id === member.id ? { ...x, is_active: !member.is_active } : x));
  }

  async function changeRole(member: Member, role: Member["role"]) {
    const res = await fetch(`/api/admin/team/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) setMembers((m) => m.map((x) => x.id === member.id ? { ...x, role } : x));
    setEditingId(null);
  }

  async function resetPassword(member: Member) {
    const newPass = resetPass[member.id];
    if (!newPass || newPass.length < 6) return;
    setSaving(true);
    const res = await fetch(`/api/admin/team/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPass }),
    });
    setSaving(false);
    if (res.ok) {
      setResetPass((r) => ({ ...r, [member.id]: "" }));
      setEditingId(null);
    }
  }

  async function handleDelete(member: Member) {
    if (!confirm(`Remove ${member.name} from the team?`)) return;
    const res = await fetch(`/api/admin/team/${member.id}`, { method: "DELETE" });
    if (res.ok) setMembers((m) => m.filter((x) => x.id !== member.id));
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h1 className="font-display" style={{ fontSize: "1.8rem" }}>Team</h1>
        {!adding && (
          <button onClick={() => setAdding(true)} style={{ padding: "9px 18px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: "pointer" }}>
            + Member
          </button>
        )}
      </div>

      {adding && (
        <div style={{ ...card, border: "1px solid var(--jood-accent)", marginBottom: "20px" }}>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--jood-accent)", marginBottom: "16px" }}>New team member</p>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px" }}>Name *</label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Sara" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px" }}>Role</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Member["role"] }))} style={inputStyle}>
                  <option value="admin">Admin — full access</option>
                  <option value="ops">Ops — turnovers & maintenance</option>
                  <option value="concierge">Concierge — requests & bookings</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--jood-ink-muted)", marginBottom: "5px" }}>Password * (min 6 characters)</label>
              <input required type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Temporary password" style={inputStyle} />
            </div>
            {error && <p style={{ fontSize: "0.875rem", color: "var(--jood-danger)" }}>{error}</p>}
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" disabled={saving} style={{ padding: "9px 20px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
                {saving ? "Adding…" : "Add member"}
              </button>
              <button type="button" onClick={() => { setAdding(false); setError(null); }} style={{ padding: "9px 14px", background: "none", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", cursor: "pointer", color: "var(--jood-ink-muted)" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!members.length && !adding && (
        <div style={{ ...card, textAlign: "center", padding: "40px", color: "var(--jood-ink-muted)" }}>
          No team members yet — add the first one.
        </div>
      )}

      {members.map((member) => (
        <div key={member.id} style={{ ...card, opacity: member.is_active ? 1 : 0.55 }}>
          {editingId === member.id ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {(["admin", "ops", "concierge"] as const).map((r) => (
                  <button key={r} onClick={() => changeRole(member, r)} style={{ padding: "7px 14px", border: `1px solid ${member.role === r ? ROLE_COLOR[r] : "var(--jood-line)"}`, borderRadius: "var(--radius-pill)", background: "none", fontSize: "0.8125rem", cursor: "pointer", color: member.role === r ? ROLE_COLOR[r] : "var(--jood-ink-muted)", textTransform: "capitalize" }}>
                    {r}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={resetPass[member.id] ?? ""}
                  onChange={(e) => setResetPass((r) => ({ ...r, [member.id]: e.target.value }))}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => resetPassword(member)}
                  disabled={saving || (resetPass[member.id]?.length ?? 0) < 6}
                  style={{ padding: "9px 14px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", border: "none", borderRadius: "var(--radius-pill)", fontSize: "0.8125rem", cursor: "pointer", whiteSpace: "nowrap", opacity: saving ? 0.5 : 1 }}
                >
                  Set password
                </button>
              </div>
              <button onClick={() => setEditingId(null)} style={{ alignSelf: "flex-start", padding: "6px 14px", background: "none", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", fontSize: "0.8125rem", cursor: "pointer", color: "var(--jood-ink-muted)" }}>
                Done
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <div>
                <p style={{ fontWeight: 500, fontSize: "0.9375rem", marginBottom: "3px" }}>{member.name}</p>
                <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: ROLE_COLOR[member.role] }}>
                  {member.role}
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <button onClick={() => setEditingId(member.id)} style={{ padding: "6px 12px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", background: "none", fontSize: "0.75rem", cursor: "pointer", color: "var(--jood-ink-muted)" }}>Edit</button>
                <button onClick={() => toggleActive(member)} style={{ padding: "6px 12px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", background: "none", fontSize: "0.75rem", cursor: "pointer", color: member.is_active ? "var(--jood-success)" : "var(--jood-ink-muted)" }}>
                  {member.is_active ? "Active" : "Inactive"}
                </button>
                <button onClick={() => handleDelete(member)} style={{ padding: "6px 12px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", background: "none", fontSize: "0.75rem", cursor: "pointer", color: "var(--jood-danger)" }}>
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <div style={{ marginTop: "32px", padding: "16px 20px", borderRadius: "var(--radius-md)", backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)", fontSize: "0.8125rem", color: "var(--jood-ink-muted)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--jood-ink)" }}>Role access</strong><br />
        <span style={{ color: ROLE_COLOR.admin }}>Admin</span> — everything<br />
        <span style={{ color: ROLE_COLOR.ops }}>Ops</span> — turnovers, maintenance, inventory<br />
        <span style={{ color: ROLE_COLOR.concierge }}>Concierge</span> — guest requests, service requests, bookings
      </div>
    </div>
  );
}
