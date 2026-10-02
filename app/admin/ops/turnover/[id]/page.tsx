import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { viewableUrl } from "@/lib/ops-photos";
import { TurnoverClient } from "@/components/admin/TurnoverClient";
import type { TurnoverTask, TurnoverItem } from "@/components/admin/TurnoverClient";

interface Props { params: Promise<{ id: string }> }

export default async function TurnoverPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const h = await headers();
  const myRole = h.get("x-admin-role") ?? "ops";
  const myName = h.get("x-admin-name") ?? "";

  const supabase = createServiceClient();
  const [{ data: task }, { data: items }, { data: teamMembers }] = await Promise.all([
    supabase
      .from("turnover_tasks")
      .select("id, status, assigned_to, notes, condition, damage_notes, created_at, started_at, completed_at, approved_at, approved_by, photo_review, properties(id, name), bookings(id, check_in, check_out, guest_first_name, guest_last_name)")
      .eq("id", id)
      .single<TurnoverTask>(),
    supabase
      .from("turnover_items")
      .select("id, room, label, checked, checked_at, photo_url, notes, sort_order")
      .eq("task_id", id)
      .order("sort_order")
      .returns<TurnoverItem[]>(),
    supabase
      .from("team_members")
      .select("id, name, role")
      .eq("is_active", true)
      .in("role", ["housekeeping", "ops"])
      .order("name"),
  ]);

  if (!task) notFound();

  const signedItems = await Promise.all((items ?? []).map(async (i) => ({ ...i, photo_url: await viewableUrl(supabase, i.photo_url) })));

  return <TurnoverClient task={task} items={signedItems} teamMembers={teamMembers ?? []} myRole={myRole} myName={myName} />;
}
