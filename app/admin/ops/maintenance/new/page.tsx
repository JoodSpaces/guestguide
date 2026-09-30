import { createServiceClient } from "@/lib/supabase/server";
import { MaintenanceClient } from "@/components/admin/MaintenanceClient";

export default async function NewMaintenancePage() {
  const supabase = createServiceClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .is("archived_at", null)
    .order("name")
    .returns<{ id: string; name: string }[]>();
  const { data: members } = await supabase
    .from("team_members").select("name").eq("is_active", true).in("role", ["admin", "ops", "maintenance"]).order("name")
    .returns<{ name: string }[]>();
  const team = (members ?? []).map((m) => m.name);

  return (
    <div>
      <MaintenanceClient properties={properties ?? []} team={team} />
    </div>
  );
}
