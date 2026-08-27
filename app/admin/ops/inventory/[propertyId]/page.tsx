import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { InventoryClient } from "@/components/admin/InventoryClient";
import type { InventoryItem } from "@/components/admin/InventoryClient";

interface Props { params: Promise<{ propertyId: string }> }

export default async function InventoryPage({ params }: Props) {
  const { propertyId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(propertyId)) notFound();

  const supabase = createServiceClient();
  const [{ data: property }, { data: items }] = await Promise.all([
    supabase.from("properties").select("id, name").eq("id", propertyId).single<{ id: string; name: string }>(),
    supabase.from("inventory_items").select("*").eq("property_id", propertyId).order("category").order("name").returns<InventoryItem[]>(),
  ]);

  if (!property) notFound();

  return <InventoryClient propertyId={propertyId} propertyName={property.name} initialItems={items ?? []} />;
}
