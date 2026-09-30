import { createServiceClient } from "@/lib/supabase/server";
import { voiceMonthlyMinutes, monthStartIso } from "@/lib/voice";

interface Row {
  id: string; started_at: string; duration_sec: number; locale: string;
  transcript: { role: "guest" | "agent"; text: string }[]; unanswered: string[]; actions: string[];
  bookings: { guest_first_name: string; guest_last_name: string; properties: { name: string } | { name: string }[] | null } | null;
}

const card: React.CSSProperties = { border: "1px solid var(--jood-line)", borderRadius: 12, padding: "16px 18px", background: "var(--jood-surface, transparent)" };
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Cairo", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function VoicePage() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("voice_sessions")
    .select("id, started_at, duration_sec, locale, transcript, unanswered, actions, bookings(guest_first_name, guest_last_name, properties(name))")
    .order("started_at", { ascending: false })
    .limit(60)
    .returns<Row[]>();

  if (error) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 300, fontSize: 30 }}>Voice concierge</h1>
        <p style={{ color: "var(--jood-ink-muted)" }}>The voice log table isn&apos;t set up yet. Run migration 032_voice_sessions.sql in the Guest App database, then reload.</p>
      </main>
    );
  }

  const rows = data ?? [];
  const since = monthStartIso();
  const monthSec = rows.filter((r) => r.started_at >= since).reduce((n, r) => n + r.duration_sec, 0);
  const cap = voiceMonthlyMinutes();
  const usedMin = monthSec / 60;
  const pct = Math.min(100, Math.round((usedMin / cap) * 100));
  const unanswered = rows.flatMap((r) => r.unanswered.map((q) => ({ q, at: r.started_at, who: r.bookings?.guest_first_name ?? "" })));
  const prop = (r: Row) => { const p = r.bookings?.properties; return (Array.isArray(p) ? p[0] : p)?.name ?? ""; };

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "32px 20px 80px", display: "grid", gap: 20 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 300, fontSize: 30, margin: 0 }}>Voice concierge</h1>

      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span>This month</span>
          <span style={{ color: pct >= 80 ? "var(--jood-danger)" : "var(--jood-ink-muted)" }}>{usedMin.toFixed(1)} of {cap} min ({pct}%)</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "var(--jood-line)", marginTop: 10 }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: pct >= 80 ? "var(--jood-danger)" : "var(--jood-accent)" }} />
        </div>
        <p style={{ fontSize: 12, color: "var(--jood-ink-subtle)", margin: "10px 0 0" }}>
          {pct >= 100 ? "The cap is reached: guests now see that voice is resting until next month." : pct >= 80 ? "Close to the cap. Raise VOICE_MONTHLY_MINUTES in Vercel after upgrading the ElevenLabs plan." : "Voice stops at the cap. Change it with VOICE_MONTHLY_MINUTES in Vercel."}
        </p>
      </section>

      <section style={card}>
        <h2 style={{ fontSize: 16, margin: "0 0 10px" }}>Questions it couldn&apos;t answer</h2>
        {unanswered.length === 0 ? <p style={{ margin: 0, color: "var(--jood-ink-muted)", fontSize: 14 }}>None yet. Each one is a gap in a house guide.</p> : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
            {unanswered.map((u, i) => <li key={i}>{u.q} <span style={{ color: "var(--jood-ink-subtle)" }}>· {u.who} · {when(u.at)}</span></li>)}
          </ul>
        )}
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Conversations</h2>
        {rows.length === 0 && <p style={{ color: "var(--jood-ink-muted)", fontSize: 14 }}>No conversations yet.</p>}
        {rows.map((r) => (
          <details key={r.id} style={card}>
            <summary style={{ cursor: "pointer", fontSize: 14 }}>
              {when(r.started_at)} · {r.bookings?.guest_first_name ?? "Guest"} · {prop(r)} · {Math.floor(r.duration_sec / 60)}m {r.duration_sec % 60}s · {r.locale.toUpperCase()}
              {r.actions.length > 0 && <span style={{ color: "var(--jood-accent)" }}> · {r.actions.length} action{r.actions.length > 1 ? "s" : ""}</span>}
              {r.unanswered.length > 0 && <span style={{ color: "var(--jood-danger)" }}> · {r.unanswered.length} unanswered</span>}
            </summary>
            <div style={{ marginTop: 12, display: "grid", gap: 8, fontSize: 14, lineHeight: 1.6 }}>
              {r.transcript.length === 0 && <span style={{ color: "var(--jood-ink-muted)" }}>No transcript saved.</span>}
              {r.transcript.map((l, i) => (
                <p key={i} style={{ margin: 0 }}><strong style={{ color: l.role === "agent" ? "var(--jood-accent)" : "var(--jood-ink)" }}>{l.role === "agent" ? "Concierge" : "Guest"}:</strong> {l.text}</p>
              ))}
              {r.actions.length > 0 && <p style={{ margin: 0, color: "var(--jood-ink-muted)" }}>Actions: {r.actions.join(", ")} (see Requests)</p>}
            </div>
          </details>
        ))}
      </section>
    </main>
  );
}
