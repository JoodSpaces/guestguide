import { createServiceClient } from "@/lib/supabase/server";
import { TeamClient } from "@/components/admin/TeamClient";

export default async function TeamPage() {
  const supabase = createServiceClient();
  const { data: members } = await supabase
    .from("team_members")
    .select("id, name, role, is_active, created_at")
    .order("created_at");

  return <TeamClient initialMembers={members ?? []} />;
}
