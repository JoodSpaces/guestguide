import { createServiceClient } from "@/lib/supabase/server";
import { ServicesEditor } from "@/components/admin/ServicesEditor";
import type { Service } from "@/components/admin/ServicesEditor";

export default async function ServicesPage() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("services").select("*").order("sort_order").order("created_at").returns<Service[]>();
  return <ServicesEditor initialServices={data ?? []} />;
}
