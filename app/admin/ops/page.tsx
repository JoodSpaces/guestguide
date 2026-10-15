import { headers } from "next/headers";
import { OpsBoardClient, type OpsTask, type OpsTicket } from "@/components/admin/OpsBoardClient";
import { createServiceClient } from "@/lib/supabase/server";
import { AutoRefresh } from "@/components/admin/AutoRefresh";

export default async function OpsPage() {
  const h = await headers();
  const myName = h.get("x-admin-name") ?? "";
  const role   = (h.get("x-admin-role") ?? "admin") as "admin" | "ops" | "housekeeping" | "maintenance" | "concierge";

  const supabase = createServiceClient();

  const [
    { data: turnovers, error: eT },
    { data: history, error: eH },
    { data: tickets, error: eK },
    { data: properties, error: eP },
    { data: teamMembers },
  ] = await Promise.all([
    supabase
      .from("turnover_tasks")
      .select("id, status, assigned_to, created_at, properties(id, name), bookings(check_out, guest_first_name, guest_last_name)")
      .in("status", ["scheduled", "pending", "in_progress", "ready"])
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("turnover_tasks")
      .select("id, status, assigned_to, approved_at, created_at, properties(id, name), bookings(check_out, guest_first_name, guest_last_name)")
      .eq("status", "approved")
      .order("approved_at", { ascending: false })
      .limit(20),
    supabase
      .from("maintenance_tickets")
      .select("id, title, priority, status, created_at, properties(id, name)")
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("properties").select("id, name").is("archived_at", null).order("name"),
    supabase.from("team_members").select("id, name, role").eq("is_active", true).in("role", ["housekeeping", "ops"]).order("name"),
  ]);

  const failed = [eT && "cleaning tasks", eH && "finished cleanings", eK && "maintenance tickets", eP && "houses"].filter(Boolean) as string[];
  const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const toTask = (t: any): OpsTask => {
    const b = one(t.bookings) as { check_out: string; guest_first_name: string } | null;
    const p = one(t.properties) as { name: string } | null;
    return { id: t.id, status: t.status, assignedTo: t.assigned_to, createdAt: t.created_at, approvedAt: t.approved_at ?? null, house: p?.name ?? "House", guest: b?.guest_first_name ?? null, checkOut: b?.check_out ?? null };
  };
  const ticketRows: OpsTicket[] = (tickets ?? []).map((t: any) => ({ id: t.id, title: t.title, priority: t.priority, status: t.status, createdAt: t.created_at, house: (one(t.properties) as { name: string } | null)?.name ?? "House" }));
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <>
      <AutoRefresh interval={30_000} />
      <OpsBoardClient
        tasks={(turnovers ?? []).map(toTask)}
        done={(history ?? []).map(toTask)}
        tickets={ticketRows}
        properties={properties ?? []}
        teamMembers={teamMembers ?? []}
        role={role}
        myName={myName}
        failed={failed}
      />
    </>
  );
}
