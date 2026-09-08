import { createServiceClient } from "@/lib/supabase/server";
import { TeamClient } from "@/components/admin/TeamClient";

export default async function TeamPage() {
  const supabase = createServiceClient();
  const { data: members } = await supabase
    .from("team_members")
    .select("id, name, role, is_active, is_owner, created_at")
    .order("created_at", { ascending: false });

  return <TeamClient initialMembers={members ?? []} />;
}
