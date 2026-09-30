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

  return (
    <div>
      <MaintenanceClient properties={properties ?? []} />
    </div>
  );
}
