import { createServiceClient } from "@/lib/supabase/server";
import type { GuestBooking } from "@/lib/guest-auth";

/**
 * What the concierge already knows about this guest, handed over at the start of a call so it does not start cold:
 * the earlier calls of this stay, requests already sent and where they stand, what the guest said about their arrival,
 * and whether they have stayed with JOOD before. Built only from this guest's own records; kept short because it is
 * sent to the voice provider. No transcripts of other guests, no money, no contact details.
 */
export interface MemoryInput {
  priorCalls: { guestLines: string[]; actions: string[]; when: string }[];
  requests: { text: string; status: string; urgent: boolean }[];
  prefs: { occasion: string | null; temp: string | null; notes: string | null } | null;
  pastStays: { property: string; month: string }[];
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const ACTION_WORDS: Record<string, string> = {
  report_problem: "reported a problem", request_service: "asked for a service", message_team: "messaged the team",
  "lookup:check_late_checkout": "asked about a late check-out", "lookup:check_extension": "asked about staying longer",
};

/** Pure: the text block. Empty string when there is nothing worth saying. */
export function formatMemory(m: MemoryInput): string {
  const out: string[] = [];
  if (m.pastStays.length) out.push(`Returning guest: stayed before (${m.pastStays.map((s) => `${s.property}, ${s.month}`).join("; ")}). A short welcome-back is fine; do not recite details.`);
  if (m.prefs && (m.prefs.occasion || m.prefs.temp || m.prefs.notes)) {
    out.push(`Arrival preferences they gave: ${[m.prefs.occasion && `occasion ${m.prefs.occasion}`, m.prefs.temp && `temperature ${m.prefs.temp}`, m.prefs.notes && `notes "${clip(m.prefs.notes, 160)}"`].filter(Boolean).join(", ")}.`);
  }
  if (m.requests.length) {
    out.push("Requests they already sent this stay (do not ask them to repeat these; use get_request_status for the latest):");
    for (const r of m.requests.slice(0, 5)) out.push(`- ${r.urgent ? "URGENT " : ""}${clip(r.text, 110)} (${r.status})`);
  }
  if (m.priorCalls.length) {
    out.push("Earlier voice conversations this stay:");
    for (const c of m.priorCalls.slice(0, 2)) {
      const did = [...new Set(c.actions.map((a) => ACTION_WORDS[a]).filter(Boolean))].join(", ");
      out.push(`- ${c.when}: the guest said ${c.guestLines.length ? c.guestLines.map((l) => `"${clip(l, 100)}"`).join(", ") : "(nothing recorded)"}${did ? `; they ${did}` : ""}.`);
    }
  }
  return out.length ? ["WHAT YOU ALREADY KNOW ABOUT THIS GUEST (use it naturally, never read it out, never mention you were given notes):", ...out].join("\n") : "";
}

const statusWord = (s: string) => ({ received: "not picked up yet", in_progress: "being handled", resolved: "resolved" } as Record<string, string>)[s] ?? s;

export async function buildMemory(booking: GuestBooking): Promise<string> {
  try {
    const supabase = createServiceClient();
    const [{ data: calls }, { data: reqs }, { data: prefs }, { data: past }] = await Promise.all([
      supabase.from("voice_sessions").select("started_at, transcript, actions").eq("booking_id", booking.id).gt("duration_sec", 5)
        .order("started_at", { ascending: false }).limit(2).returns<{ started_at: string; transcript: { role: string; text: string }[]; actions: string[] }[]>(),
      supabase.from("guest_requests").select("body, status, urgency").eq("booking_id", booking.id).order("created_at", { ascending: false }).limit(5)
        .returns<{ body: string; status: string; urgency: string }[]>(),
      supabase.from("arrival_preferences").select("occasion, temp_pref, notes").eq("booking_id", booking.id).maybeSingle<{ occasion: string | null; temp_pref: string | null; notes: string | null }>(),
      booking.guest_email
        ? supabase.from("bookings").select("check_out, properties(name)").eq("guest_email", booking.guest_email).neq("id", booking.id).neq("status", "cancelled")
            .lt("check_out", new Date().toISOString()).order("check_out", { ascending: false }).limit(2)
            .returns<{ check_out: string; properties: { name: string } | { name: string }[] | null }[]>()
        : Promise.resolve({ data: [] as { check_out: string; properties: { name: string } | null }[] }),
    ]);
    return formatMemory({
      priorCalls: (calls ?? []).map((c) => ({
        when: new Date(c.started_at).toLocaleString("en-GB", { timeZone: "Africa/Cairo", weekday: "long", hour: "2-digit", minute: "2-digit" }),
        guestLines: c.transcript.filter((l) => l.role === "guest").slice(0, 4).map((l) => l.text),
        actions: c.actions,
      })),
      requests: (reqs ?? []).map((r) => ({ text: r.body.replace(/^\[(Voice concierge|EMERGENCY[^\]]*)\]\s*/g, "").replace(/^\[Voice concierge\]\s*/, ""), status: statusWord(r.status), urgent: r.urgency === "urgent" })),
      prefs: prefs ? { occasion: prefs.occasion, temp: prefs.temp_pref, notes: prefs.notes } : null,
      pastStays: (past ?? []).map((p) => {
        const pr = Array.isArray(p.properties) ? p.properties[0] : p.properties;
        return { property: pr?.name ?? "a JOOD house", month: new Date(p.check_out).toLocaleDateString("en-GB", { timeZone: "Africa/Cairo", month: "long", year: "numeric" }) };
      }),
    });
  } catch {
    return ""; // memory is a nicety: never let it break a call
  }
}
