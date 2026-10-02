import type { SupabaseClient } from "@supabase/supabase-js";
import { voiceMonthlyMinutes, monthStartIso, voiceEnabled } from "@/lib/voice";
import { aiEnabled } from "@/lib/ai";
import { getAiProbe, type AiProbe } from "@/lib/ai-probe";

/**
 * The Guest App's side of the Control Tower: a read-only picture of operations and safety, served to the website's
 * `tower-engine` over the signed bridge. It carries NO guest names, contact details, door codes or message text: only
 * counts, property names, categories, dates and ages. The engine's rules decide what it means.
 */
export interface TowerSnapshot {
  generated_at: string;
  coverage: { bookings: number; requests: number; turnovers: number; maintenance: number; voice_sessions: number };
  emergencies: { id: string; property: string; category: string; status: string; age_hours: number }[];
  arrivals: { property: string; property_id: string; check_in: string; turnover: string | null }[];
  no_turnover_after_checkout: { property: string; check_out: string }[];
  photo: { flagged: { task_id: string; property: string; flags: number }[]; done_without_photos: { task_id: string; property: string }[] } | null;
  maintenance_overdue: { id: string; property: string; title: string; age_hours: number }[];
  voice: { gaps_30d: number; minutes_this_month: number; monthly_cap: number };
  stays: { ref: string; check_out: string }[];
  ai: { text_configured: boolean; voice_configured: boolean };
  errors: string[];
  ai_probe: AiProbe | null;
  access: Access | null;
  door_code: DoorCodes | null;
  fast_turnovers: FastTurnover[];
  trend: Trend | null;
}

export interface Access { failed_logins_24h: number; logins_24h: number; team_changes_7d: { action: string; name: string; at: string }[] }
export interface DoorCodes { failures_24h: { property: string; failures: number }[]; reveals_24h: number }
export interface FastTurnover { task_id: string; property: string; assigned_to: string | null; minutes: number; items: number }
export interface Trend { properties: { name: string; urgent_30d: number; urgent_prior: number; maintenance_30d: number; maintenance_prior: number }[] }

export interface AuditRow { action: string; entity_id: string | null; meta: Record<string, unknown> | null; created_at: string }

// ── Pure summaries (tested) ───────────────────────────────────────────────
export function summariseAccess(rows: AuditRow[], teamNames: Record<string, string>, now: number): Access {
  const since24 = now - 24 * HOUR, since7d = now - 7 * 24 * HOUR;
  const at = (r: AuditRow) => Date.parse(r.created_at);
  return {
    failed_logins_24h: rows.filter((r) => r.action === "login.failed" && at(r) >= since24).length,
    logins_24h: rows.filter((r) => r.action === "login.success" && at(r) >= since24).length,
    team_changes_7d: rows.filter((r) => /^team\.(created|updated|deleted)$/.test(r.action) && at(r) >= since7d).map((r) => ({
      action: r.action.replace("team.", ""), name: String(r.meta?.name ?? teamNames[r.entity_id ?? ""] ?? "a team account").slice(0, 40), at: r.created_at,
    })),
  };
}

export function summariseDoorCodes(rows: AuditRow[], bookingProperty: Map<string, string>, now: number): DoorCodes {
  const since24 = now - 24 * HOUR;
  const fails = new Map<string, number>();
  let reveals = 0;
  for (const r of rows) {
    if (Date.parse(r.created_at) < since24) continue;
    if (r.action === "door_code_revealed") reveals++;
    if (r.action === "door_code_second_factor_failed") { const p = bookingProperty.get(r.entity_id ?? "") ?? "a property"; fails.set(p, (fails.get(p) ?? 0) + 1); }
  }
  return { failures_24h: [...fails.entries()].map(([property, failures]) => ({ property, failures })).sort((a, b) => b.failures - a.failures), reveals_24h: reveals };
}

/** A cleaning marked done far faster than a full checklist normally takes. A prompt to look at the photos, never a verdict. */
export function findFastTurnovers(tasks: { id: string; property_id: string; assigned_to: string | null; started_at: string | null; completed_at: string | null }[], itemCounts: Map<string, number>, propertyName: (id: string) => string): FastTurnover[] {
  const out: FastTurnover[] = [];
  for (const t of tasks) {
    if (!t.started_at || !t.completed_at) continue;
    const minutes = Math.round((Date.parse(t.completed_at) - Date.parse(t.started_at)) / 60000);
    const items = itemCounts.get(t.id) ?? 0;
    if (minutes >= 0 && minutes < 15 && items >= 8) out.push({ task_id: t.id, property: propertyName(t.property_id), assigned_to: t.assigned_to, minutes, items });
  }
  return out;
}

export function buildTrend(urgent: { created_at: string; property_id: string | null }[], maintenance: { created_at: string; property_id: string }[], propertyName: (id: string) => string, now: number): Trend {
  const cur = (iso: string) => now - Date.parse(iso) < 30 * 24 * HOUR;
  const props = new Map<string, Trend["properties"][number]>();
  const row = (id: string) => props.get(id) ?? props.set(id, { name: propertyName(id), urgent_30d: 0, urgent_prior: 0, maintenance_30d: 0, maintenance_prior: 0 }).get(id)!;
  for (const u of urgent) if (u.property_id) { const r = row(u.property_id); if (cur(u.created_at)) r.urgent_30d++; else r.urgent_prior++; }
  for (const m of maintenance) { const r = row(m.property_id); if (cur(m.created_at)) r.maintenance_30d++; else r.maintenance_prior++; }
  return { properties: [...props.values()] };
}

export interface RawTowerData {
  now: number;
  bookings: { id: string; property_id: string; external_ref: string | null; check_in: string; check_out: string; status: string }[];
  properties: { id: string; name: string }[];
  requests: { id: string; booking_id: string; category: string; urgency: string; status: string; created_at: string }[];
  turnovers: { id: string; booking_id: string | null; property_id: string; status: string; photo_review?: { flags?: unknown[] } | null; photo_count?: number }[];
  maintenance: { id: string; property_id: string; title: string; priority: string; status: string; created_at: string }[];
  voice: { started_at: string; duration_sec: number; unanswered: string[] }[];
  errors?: string[];
}

const HOUR = 3_600_000;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });

/** Pure: turn raw rows into the snapshot. Everything the engine needs, nothing personal. */
export function buildTowerSnapshot(raw: RawTowerData): TowerSnapshot {
  const { now } = raw;
  const pname = new Map(raw.properties.map((p) => [p.id, p.name]));
  const name = (id: string) => pname.get(id) ?? "a property";
  const byBooking = new Map(raw.bookings.map((b) => [b.id, b]));
  const live = raw.bookings.filter((b) => b.status !== "cancelled");

  const emergencies = raw.requests
    .filter((r) => r.urgency === "urgent" && r.status !== "resolved")
    .map((r) => ({
      id: r.id, category: r.category, status: r.status,
      property: name(byBooking.get(r.booking_id)?.property_id ?? ""),
      age_hours: Math.max(0, Math.round(((now - Date.parse(r.created_at)) / HOUR) * 10) / 10),
    }));

  const turnoverFor = new Map(raw.turnovers.filter((t) => t.booking_id).map((t) => [t.booking_id as string, t]));
  // The turnover that must be finished before a guest arrives is the one for the PREVIOUS stay in that property.
  const arrivals = live
    .filter((b) => Date.parse(b.check_in) > now && Date.parse(b.check_in) - now <= 24 * HOUR)
    .map((b) => {
      const prev = live
        .filter((p) => p.property_id === b.property_id && p.id !== b.id && Date.parse(p.check_out) <= Date.parse(b.check_in))
        .sort((x, y) => Date.parse(y.check_out) - Date.parse(x.check_out))[0];
      return { property: name(b.property_id), property_id: b.property_id, check_in: b.check_in, turnover: prev ? (turnoverFor.get(prev.id)?.status ?? "missing") : null };
    });

  const no_turnover_after_checkout = live
    .filter((b) => Date.parse(b.check_out) < now && now - Date.parse(b.check_out) < 48 * HOUR && !turnoverFor.has(b.id))
    .map((b) => ({ property: name(b.property_id), check_out: b.check_out }));

  const photoTasks = raw.turnovers.filter((t) => t.photo_review !== undefined || t.photo_count !== undefined);
  const photo = raw.errors?.includes("photo_review_unavailable")
    ? null
    : {
        flagged: raw.turnovers
          .filter((t) => (t.photo_review?.flags?.length ?? 0) > 0 && t.status !== "approved")
          .map((t) => ({ task_id: t.id, property: name(t.property_id), flags: t.photo_review!.flags!.length })),
        done_without_photos: photoTasks
          .filter((t) => (t.status === "ready" || t.status === "approved") && (t.photo_count ?? 0) === 0)
          .map((t) => ({ task_id: t.id, property: name(t.property_id) })),
      };

  const maintenance_overdue = raw.maintenance
    .filter((m) => m.priority === "urgent" && m.status !== "resolved" && now - Date.parse(m.created_at) > 24 * HOUR)
    .map((m) => ({ id: m.id, property: name(m.property_id), title: m.title.slice(0, 80), age_hours: Math.round((now - Date.parse(m.created_at)) / HOUR) }));

  const monthStart = Date.parse(monthStartIso(new Date(now)));
  const thirtyDays = now - 30 * 24 * HOUR;
  return {
    generated_at: new Date(now).toISOString(),
    coverage: { bookings: raw.bookings.length, requests: raw.requests.length, turnovers: raw.turnovers.length, maintenance: raw.maintenance.length, voice_sessions: raw.voice.length },
    emergencies, arrivals, no_turnover_after_checkout, photo, maintenance_overdue,
    voice: {
      gaps_30d: raw.voice.filter((v) => Date.parse(v.started_at) >= thirtyDays).reduce((n, v) => n + v.unanswered.length, 0),
      minutes_this_month: Math.round(raw.voice.filter((v) => Date.parse(v.started_at) >= monthStart).reduce((n, v) => n + v.duration_sec, 0) / 60),
      monthly_cap: voiceMonthlyMinutes(),
    },
    stays: live.filter((b) => /^JOOD-[A-Z0-9]{6}$/.test(b.external_ref ?? "") && Date.parse(b.check_out) > now - 7 * 24 * HOUR).map((b) => ({ ref: b.external_ref as string, check_out: day(b.check_out) })),
    ai: { text_configured: aiEnabled(), voice_configured: voiceEnabled() },
    errors: raw.errors ?? [],
    ai_probe: null, access: null, door_code: null, fast_turnovers: [], trend: null,
  };
}

/** I/O: read the rows. Each read is tolerant: a failing table becomes an entry in `errors`, never a crash. */
export async function loadTowerSnapshot(supabase: SupabaseClient, now = Date.now()): Promise<TowerSnapshot> {
  const errors: string[] = [];
  const since = new Date(now - 14 * 24 * HOUR).toISOString();
  const ahead = new Date(now + 3 * 24 * HOUR).toISOString();
  async function read<T>(label: string, q: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
    const { data, error } = await q;
    if (error) { errors.push(`${label}: ${error.message.slice(0, 120)}`); return []; }
    return data ?? [];
  }
  const [bookings, properties, requests, maintenance, voice] = await Promise.all([
    read<RawTowerData["bookings"][number]>("bookings", supabase.from("bookings").select("id, property_id, external_ref, check_in, check_out, status").gte("check_out", since).lte("check_in", ahead).limit(2000)),
    read<RawTowerData["properties"][number]>("properties", supabase.from("properties").select("id, name").limit(500)),
    read<RawTowerData["requests"][number]>("requests", supabase.from("guest_requests").select("id, booking_id, category, urgency, status, created_at").gte("created_at", since).limit(2000)),
    read<RawTowerData["maintenance"][number]>("maintenance", supabase.from("maintenance_tickets").select("id, property_id, title, priority, status, created_at").neq("status", "resolved").limit(500)),
    read<RawTowerData["voice"][number]>("voice", supabase.from("voice_sessions").select("started_at, duration_sec, unanswered").gte("started_at", new Date(now - 35 * 24 * HOUR).toISOString()).limit(2000)),
  ]);

  // Turnovers: the photo_review column only exists after migration 035, so try with it and fall back without.
  type T = RawTowerData["turnovers"][number];
  let turnovers: T[] = [];
  const withReview = await supabase.from("turnover_tasks").select("id, booking_id, property_id, status, photo_review").gte("created_at", since).limit(2000);
  if (!withReview.error) {
    turnovers = (withReview.data ?? []) as T[];
    const ids = turnovers.map((t) => t.id);
    if (ids.length) {
      const items = await read<{ task_id: string }>("turnover photos", supabase.from("turnover_items").select("task_id").in("task_id", ids).not("photo_url", "is", null).limit(20000));
      const counts = new Map<string, number>();
      for (const i of items) counts.set(i.task_id, (counts.get(i.task_id) ?? 0) + 1);
      turnovers = turnovers.map((t) => ({ ...t, photo_count: counts.get(t.id) ?? 0 }));
    }
  } else {
    errors.push("photo_review_unavailable");
    turnovers = await read<T>("turnovers", supabase.from("turnover_tasks").select("id, booking_id, property_id, status").gte("created_at", since).limit(2000));
  }
  const snapshot = buildTowerSnapshot({ now, bookings, properties, requests, turnovers, maintenance, voice, errors });
  const pname = (id: string) => properties.find((p) => p.id === id)?.name ?? "a property";

  // Access, door codes, cleaning speed and trends. Each is optional: a failure leaves that part out and is reported.
  const [audit, team, tasks, urgentRows, maintRows, probe] = await Promise.all([
    read<AuditRow>("audit", supabase.from("audit_log").select("action, entity_id, meta, created_at").gte("created_at", new Date(now - 7 * 24 * HOUR).toISOString()).in("action", ["login.failed", "login.success", "team.created", "team.updated", "team.deleted", "door_code_second_factor_failed", "door_code_revealed"]).limit(5000)),
    read<{ id: string; name: string }>("team", supabase.from("team_members").select("id, name").limit(500)),
    read<{ id: string; property_id: string; assigned_to: string | null; started_at: string | null; completed_at: string | null }>("fast turnovers", supabase.from("turnover_tasks").select("id, property_id, assigned_to, started_at, completed_at").not("completed_at", "is", null).gte("completed_at", since).limit(500)),
    supabase.from("guest_requests").select("created_at, bookings(property_id)").eq("urgency", "urgent").gte("created_at", new Date(now - 60 * 24 * HOUR).toISOString()).limit(5000),
    read<{ created_at: string; property_id: string }>("maintenance history", supabase.from("maintenance_tickets").select("created_at, property_id").gte("created_at", new Date(now - 60 * 24 * HOUR).toISOString()).limit(5000)),
    getAiProbe(now).catch(() => null),
  ]);
  snapshot.errors = errors;
  snapshot.ai_probe = probe;
  snapshot.access = summariseAccess(audit, Object.fromEntries(team.map((t) => [t.id, t.name])), now);
  const bookingProp = new Map<string, string>();
  const doorIds = [...new Set(audit.filter((a) => a.action.startsWith("door_code") && a.entity_id).map((a) => a.entity_id as string))];
  if (doorIds.length) {
    const rows = await read<{ id: string; property_id: string }>("door code bookings", supabase.from("bookings").select("id, property_id").in("id", doorIds));
    for (const b of rows) bookingProp.set(b.id, pname(b.property_id));
  }
  snapshot.door_code = summariseDoorCodes(audit, bookingProp, now);
  if (tasks.length) {
    const items = await read<{ task_id: string }>("checklist sizes", supabase.from("turnover_items").select("task_id").in("task_id", tasks.map((t) => t.id)).limit(20000));
    const counts = new Map<string, number>();
    for (const i of items) counts.set(i.task_id, (counts.get(i.task_id) ?? 0) + 1);
    snapshot.fast_turnovers = findFastTurnovers(tasks, counts, pname);
  }
  if (!urgentRows.error) {
    const urgent = ((urgentRows.data ?? []) as unknown as { created_at: string; bookings: { property_id: string } | { property_id: string }[] | null }[])
      .map((u) => ({ created_at: u.created_at, property_id: (Array.isArray(u.bookings) ? u.bookings[0]?.property_id : u.bookings?.property_id) ?? null }));
    snapshot.trend = buildTrend(urgent, maintRows, pname, now);
  } else errors.push(`urgent history: ${urgentRows.error.message.slice(0, 80)}`);
  return snapshot;
}
