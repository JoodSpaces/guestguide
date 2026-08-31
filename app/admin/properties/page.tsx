import { createServiceClient } from "@/lib/supabase/server";
import { PropertiesClient, type Property } from "@/components/admin/PropertiesClient";

export default async function PropertiesPage() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("properties")
    .select("id, slug, name, name_ar, city, address, bedrooms, max_guests, wifi_ssid")
    .order("name")
    .returns<Property[]>();

  return <PropertiesClient initialProperties={data ?? []} />;
}
