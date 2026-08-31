import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export interface ActivityEvent {
  id: string;
  type: "service_request" | "guest_request" | "maintenance" | "guest_arrived" | "checkout" | "arrival";
  title: string;
  subtitle: string;
  timestamp: string;
  urgency?: "urgent";
  href?: string;
}

export async function GET() {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date().toISOString().slice(0, 10) + "T00:00:00Z";
  const todayEnd   = new Date().toISOString().slice(0, 10) + "T23:59:59Z";

  const [
    { data: serviceReqs },
    { data: guestReqs },
    { data: tickets },
    { data: arrivals },
    { data: departures },
    { data: recentOpens },
  ] = await Promise.all([
    supabase
      .from("service_requests")
      .select("id, status, created_at, updated_at, services(name_en), bookings(guest_first_name, properties(name))")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("requests")
      .select("id, category, urgency, status, created_at, bookings(guest_first_name, properties(name))")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("maintenance_tickets")
      .select("id, title, priority, created_at, properties(name)")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("bookings")
      .select("id, guest_first_name, guest_last_name, check_in, properties(name)")
      .gte("check_in", todayStart)
      .lte("check_in", todayEnd)
      .eq("status", "confirmed"),
    supabase
      .from("bookings")
      .select("id, guest_first_name, guest_last_name, check_out, properties(name)")
      .gte("check_out", todayStart)
      .lte("check_out", todayEnd)
      .eq("status", "confirmed"),
    supabase
      .from("stay_tokens")
      .select("id, last_opened_at, bookings(guest_first_name, properties(name))")
      .gte("last_opened_at", since)
      .not("last_opened_at", "is", null)
      .order("last_opened_at", { ascending: false })
      .limit(10),
  ]);

  const events: ActivityEvent[] = [];

  for (const r of serviceReqs ?? []) {
    const b = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
    const s = Array.isArray(r.services) ? r.services[0] : r.services;
    const p = Array.isArray(b?.properties) ? b?.properties[0] : b?.properties;
    events.push({
      id: `sr-${r.id}`,
      type: "service_request",
      title: s?.name_en ?? "Service request",
      subtitle: `${b?.guest_first_name ?? "Guest"} · ${p?.name ?? ""}`,
      timestamp: r.created_at,
      href: `/admin/requests/service/${r.id}`,
    });
  }

  for (const r of guestReqs ?? []) {
    const b = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
    const p = Array.isArray(b?.properties) ? b?.properties[0] : b?.properties;
    events.push({
      id: `gr-${r.id}`,
      type: "guest_request",
      title: capitalize(r.category),
      subtitle: `${b?.guest_first_name ?? "Guest"} · ${p?.name ?? ""}`,
      timestamp: r.created_at,
      urgency: r.urgency === "urgent" ? "urgent" : undefined,
      href: `/admin/requests/guest/${r.id}`,
    });
  }

  for (const t of tickets ?? []) {
    const p = Array.isArray(t.properties) ? t.properties[0] : t.properties;
    events.push({
      id: `mt-${t.id}`,
      type: "maintenance",
      title: t.title,
      subtitle: p?.name ?? "",
      timestamp: t.created_at,
      urgency: t.priority === "urgent" ? "urgent" : undefined,
      href: `/admin/ops/maintenance/${t.id}`,
    });
  }

  for (const b of arrivals ?? []) {
    const p = Array.isArray(b.properties) ? b.properties[0] : b.properties;
    events.push({
      id: `arr-${b.id}`,
      type: "arrival",
      title: `${b.guest_first_name} ${b.guest_last_name}`,
      subtitle: `Arriving today · ${p?.name ?? ""}`,
      timestamp: b.check_in,
    });
  }

  for (const b of departures ?? []) {
    const p = Array.isArray(b.properties) ? b.properties[0] : b.properties;
    events.push({
      id: `dep-${b.id}`,
      type: "checkout",
      title: `${b.guest_first_name} ${b.guest_last_name}`,
      subtitle: `Checking out today · ${p?.name ?? ""}`,
      timestamp: b.check_out,
    });
  }

  for (const t of recentOpens ?? []) {
    const b = Array.isArray(t.bookings) ? t.bookings[0] : t.bookings;
    const p = Array.isArray(b?.properties) ? b?.properties[0] : b?.properties;
    if (!t.last_opened_at) continue;
    events.push({
      id: `open-${t.id}`,
      type: "guest_arrived",
      title: `${b?.guest_first_name ?? "Guest"} opened their guide`,
      subtitle: p?.name ?? "",
      timestamp: t.last_opened_at,
    });
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json(events.slice(0, 40));
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
