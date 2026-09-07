import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const session = await requireSession(req, ["admin", "ops", "housekeeping", "maintenance", "concierge"]);
  if (!session) return forbidden();

  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const todayStart = now.slice(0, 10) + "T00:00:00Z";
  const todayEnd   = now.slice(0, 10) + "T23:59:59Z";

  const [
    { data: arrivals },
    { data: departures },
    { data: openRequests },
    { data: activeTurnovers },
    { data: openTickets },
    { data: pendingServices },
    { data: invAlerts },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, guest_first_name, guest_last_name, properties(name)")
      .gte("check_in", todayStart).lte("check_in", todayEnd)
      .eq("status", "confirmed"),
    supabase
      .from("bookings")
      .select("id, guest_first_name, guest_last_name, properties(name)")
      .gte("check_out", todayStart).lte("check_out", todayEnd)
      .eq("status", "confirmed"),
    supabase
      .from("guest_requests")
      .select("id, category, urgency, created_at, bookings(guest_first_name, properties(name))")
      .in("status", ["received", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("turnover_tasks")
      .select("id, status, assigned_to, properties(id, name), bookings(check_out, guest_first_name, guest_last_name)")
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false }),
    supabase
      .from("maintenance_tickets")
      .select("id, title, priority, status, property_id, properties(name)")
      .neq("status", "resolved")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("service_requests")
      .select("id, quantity, created_at, services(name_en), bookings(guest_first_name, guest_last_name, property_id, properties(name))")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("inventory_alerts")
      .select("id, alert_type, severity, message, property_id")
      .is("resolved_at", null)
      .order("severity", { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    arrivals:        arrivals        ?? [],
    departures:      departures      ?? [],
    openRequests:    openRequests    ?? [],
    activeTurnovers: activeTurnovers ?? [],
    openTickets:     openTickets     ?? [],
    pendingServices: pendingServices ?? [],
    invAlerts:       invAlerts       ?? [],
  });
}
