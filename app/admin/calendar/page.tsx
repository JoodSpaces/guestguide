import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { scopeFromHeaders } from "@/lib/admin-scope";
import { cairoDay } from "@/lib/cairo-time";
import { cairoDate, monthBounds, type CalEvent, type CalStay } from "@/lib/calendar-events";
import { CalendarClient } from "@/components/admin/CalendarClient";
import { externalBlocks, BLOCK_LABEL } from "@/lib/website-calendar";

export const dynamic = "force-dynamic";

type One<T> = T | T[] | null;
const one = <T,>(v: One<T>): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export default async function AdminCalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const h = await headers();
  if (!h.get("x-admin-role")) redirect("/admin/login");
  const scope = scopeFromHeaders(h);
  const today = cairoDay().date;
  const sp = await searchParams;
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.m ?? "") ? sp.m! : today.slice(0, 7);
  const { first, next } = monthBounds(month);
  // A day boundary in UTC a day either side, then filtered on the Cairo date, so a late-night event never falls off the edge.
  const from = new Date(new Date(first).getTime() - 86400000).toISOString();
  const to = new Date(new Date(next).getTime() + 86400000).toISOString();
  const inMonth = (d: string) => d >= first && d < next;

  const supabase = createServiceClient();
  let bq = supabase.from("bookings").select("id, guest_first_name, guest_last_name, check_in, check_out, status, property_id, properties(name)").neq("status", "cancelled").lt("check_in", to).gte("check_out", from);
  let tq = supabase.from("turnover_tasks").select("id, status, property_id, created_at, properties(name), bookings(check_out, guest_first_name)").gte("created_at", new Date(new Date(first).getTime() - 60 * 86400000).toISOString()).order("created_at", { ascending: false }).limit(400);
  let mq = supabase.from("maintenance_tickets").select("id, title, priority, status, property_id, created_at, resolved_at, properties(name)").or(`created_at.gte.${from},resolved_at.gte.${from}`).limit(400);
  let sq = supabase.from("service_requests").select("id, status, quantity, created_at, services(name_en), bookings(guest_first_name, property_id, properties(name))").gte("created_at", from).lt("created_at", to).limit(400);
  let gq = supabase.from("guest_requests").select("id, category, urgency, status, body, created_at, bookings(guest_first_name, property_id, properties(name))").gte("created_at", from).lt("created_at", to).limit(400);
  let pq = supabase.from("properties").select("id, name, slug").is("archived_at", null).order("name");
  if (scope) { bq = bq.in("property_id", scope); tq = tq.in("property_id", scope); mq = mq.in("property_id", scope); pq = pq.in("id", scope); }

  const [b, t, m, s, g, p] = await Promise.all([bq, tq, mq, sq, gq, pq]);
  const failed = [b.error && "bookings", t.error && "cleanings", m.error && "maintenance", s.error && "service orders", g.error && "guest requests", p.error && "houses"].filter(Boolean) as string[];

  const events: CalEvent[] = [];
  const stays: CalStay[] = [];
  for (const r of (b.data ?? []) as any[]) {
    const prop = one(r.properties) as { name: string } | null;
    const guest = `${r.guest_first_name} ${r.guest_last_name}`.trim();
    const inD = cairoDate(r.check_in), outD = cairoDate(r.check_out);
    stays.push({ id: r.id, from: inD, to: outD, guest, propertyId: r.property_id, propertyName: prop?.name ?? "", href: `/admin/bookings/${r.id}` });
    if (inMonth(inD)) events.push({ id: r.id + "i", date: inD, kind: "checkin", title: guest, sub: prop?.name ?? "", propertyId: r.property_id, href: `/admin/bookings/${r.id}`, state: "Arriving", tone: "warn" });
    if (inMonth(outD)) events.push({ id: r.id + "o", date: outD, kind: "checkout", title: guest, sub: prop?.name ?? "", propertyId: r.property_id, href: `/admin/bookings/${r.id}`, state: "Leaving", tone: "info" });
  }
  for (const r of (t.data ?? []) as any[]) {
    const bk = one(r.bookings) as { check_out: string; guest_first_name: string } | null;
    const date = bk?.check_out ? cairoDate(bk.check_out) : cairoDate(r.created_at);
    if (!inMonth(date)) continue;
    const prop = one(r.properties) as { name: string } | null;
    const done = r.status === "approved" || r.status === "ready";
    events.push({ id: r.id, date, kind: "clean", title: bk ? `Clean after ${bk.guest_first_name}` : "Cleaning", sub: prop?.name ?? "", propertyId: r.property_id, href: `/admin/ops/turnover/${r.id}`, state: String(r.status).replace("_", " "), tone: done ? "ok" : "neutral" });
  }
  for (const r of (m.data ?? []) as any[]) {
    const prop = one(r.properties) as { name: string } | null;
    const urgent = r.priority === "urgent" && r.status !== "resolved";
    const openD = cairoDate(r.created_at);
    if (inMonth(openD)) events.push({ id: r.id, date: openD, kind: "fix", title: r.title, sub: prop?.name ?? "", propertyId: r.property_id, href: `/admin/ops/maintenance/${r.id}`, state: r.status === "resolved" ? "Fixed" : r.priority === "urgent" ? "Urgent" : "Open", tone: r.status === "resolved" ? "ok" : urgent ? "danger" : "neutral", urgent });
    if (r.resolved_at) {
      const doneD = cairoDate(r.resolved_at);
      if (inMonth(doneD) && doneD !== openD) events.push({ id: r.id + "r", date: doneD, kind: "fix", title: `Fixed: ${r.title}`, sub: prop?.name ?? "", propertyId: r.property_id, href: `/admin/ops/maintenance/${r.id}`, state: "Fixed", tone: "ok" });
    }
  }
  for (const r of (s.data ?? []) as any[]) {
    const date = cairoDate(r.created_at);
    if (!inMonth(date)) continue;
    const bk = one(r.bookings) as { guest_first_name: string; property_id: string; properties: One<{ name: string }> } | null;
    const svc = one(r.services) as { name_en: string } | null;
    const prop = bk ? one(bk.properties) : null;
    events.push({ id: r.id, date, kind: "service", title: `${svc?.name_en ?? "Service"}${r.quantity > 1 ? ` ×${r.quantity}` : ""}`, sub: `${bk?.guest_first_name ?? ""}${prop?.name ? ` · ${prop.name}` : ""}`, propertyId: bk?.property_id ?? null, href: `/admin/requests/service/${r.id}`, state: String(r.status), tone: r.status === "pending" ? "info" : "neutral" });
  }
  for (const r of (g.data ?? []) as any[]) {
    const date = cairoDate(r.created_at);
    if (!inMonth(date)) continue;
    const bk = one(r.bookings) as { guest_first_name: string; property_id: string; properties: One<{ name: string }> } | null;
    const prop = bk ? one(bk.properties) : null;
    const urgent = r.urgency === "urgent" && r.status !== "resolved";
    events.push({ id: r.id, date, kind: "request", title: String(r.body).slice(0, 80), sub: `${bk?.guest_first_name ?? ""}${prop?.name ? ` · ${prop.name}` : ""}`, propertyId: bk?.property_id ?? null, href: `/admin/requests/guest/${r.id}`, state: urgent ? "Urgent" : String(r.status).replace("_", " "), tone: urgent ? "danger" : "warn", urgent });
  }

  // What the other channels (Airbnb, Booking.com) and staff holds have taken, as stays under their own name.
  const props = (p.data ?? []) as { id: string; name: string; slug: string }[];
  try {
    const blocks = await externalBlocks(props.map((x) => x.slug), first, next);
    const bySlug = new Map(props.map((x) => [x.slug, x]));
    for (const bl of blocks) {
      const prop = bySlug.get(bl.slug);
      if (!prop) continue;
      stays.push({ id: `ext-${bl.slug}-${bl.from}`, from: bl.from, to: bl.to, guest: BLOCK_LABEL[bl.kind] ?? "Blocked", propertyId: prop.id, propertyName: prop.name, href: "/admin/calendar" });
    }
  } catch {
    failed.push("other channels");
  }

  return <CalendarClient month={month} today={today} events={events} stays={stays} properties={props.map(({ id, name }) => ({ id, name }))} failed={failed} />;
}
