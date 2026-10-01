"use client";

import { useState } from "react";
import type { GapGroup } from "@/lib/voice-gaps";

const card: React.CSSProperties = { border: "1px solid var(--jood-line)", borderRadius: 12, padding: "14px 16px" };
const input: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid var(--jood-line)", borderRadius: 8, background: "transparent", color: "var(--jood-ink)", fontSize: 14, font: "inherit" };
const pill = (primary: boolean): React.CSSProperties => ({ padding: "8px 16px", borderRadius: 999, fontSize: 13, cursor: "pointer", border: "1px solid var(--jood-line)", background: primary ? "var(--jood-ink)" : "transparent", color: primary ? "var(--jood-ground)" : "var(--jood-ink-muted)" });

function Gap({ g, onDone }: { g: GapGroup; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(g.questions[0].replace(/[?؟]+$/, "").slice(0, 100));
  const [body, setBody] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function send(action: "answer" | "dismiss") {
    if (action === "dismiss" && !confirm("Dismiss this question without adding an answer?")) return;
    setBusy(true); setMsg(null);
    const res = await fetch("/api/admin/voice/gaps", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ propertyId: g.propertyId, questions: g.questions, action, titleEn: title, bodyEn: body, titleAr: title, bodyAr }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) onDone(); else setMsg(res?.status === 400 ? "Add a title and an answer." : "Could not save.");
  }

  return (
    <div style={card}>
      <p style={{ margin: 0, fontSize: 15 }}>{g.questions[0]}</p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--jood-ink-subtle)" }}>
        {g.propertyName} · asked {g.asked}×{g.questions.length > 1 ? ` · also: ${g.questions.slice(1, 3).join(" / ")}` : ""}
      </p>
      {!open ? (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button type="button" style={pill(true)} onClick={() => setOpen(true)}>Answer it</button>
          <button type="button" style={pill(false)} onClick={() => send("dismiss")} disabled={busy}>Dismiss</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title in the house guide" maxLength={120} />
          <textarea style={{ ...input, minHeight: 84 }} value={body} onChange={(e) => setBody(e.target.value)} placeholder="The answer, in English. Only facts: the voice concierge will repeat this." maxLength={4000} />
          <textarea style={{ ...input, minHeight: 64 }} value={bodyAr} onChange={(e) => setBodyAr(e.target.value)} placeholder="الإجابة بالعربية (اختياري)" dir="rtl" maxLength={4000} />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" style={pill(true)} onClick={() => send("answer")} disabled={busy}>{busy ? "Saving…" : "Add to house guide"}</button>
            <button type="button" style={pill(false)} onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
            {msg && <span style={{ fontSize: 13, color: "var(--jood-danger)" }}>{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export function VoiceGaps({ groups }: { groups: GapGroup[] }) {
  const [gone, setGone] = useState<Set<string>>(new Set());
  const key = (g: GapGroup) => g.propertyId + g.questions[0];
  const shown = groups.filter((g) => !gone.has(key(g)));
  if (shown.length === 0) return <p style={{ margin: 0, color: "var(--jood-ink-muted)", fontSize: 14 }}>None open. Each one is a gap in a house guide.</p>;
  return <div style={{ display: "grid", gap: 10 }}>{shown.map((g) => <Gap key={key(g)} g={g} onDone={() => setGone((s) => new Set(s).add(key(g)))} />)}</div>;
}
