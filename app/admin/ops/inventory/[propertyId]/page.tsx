import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { scopeFromHeaders } from "@/lib/admin-scope";
import { createServiceClient } from "@/lib/supabase/server";
import { InventoryClient } from "@/components/admin/InventoryClient";
import type { InventoryItem } from "@/components/admin/InventoryClient";

interface Props { params: Promise<{ propertyId: string }> }

export default async function InventoryPage({ params }: Props) {
  const { propertyId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(propertyId)) notFound();
  // A member limited to some properties must not reach another property's stock by typing its address.
  const scope = scopeFromHeaders(await headers());
  if (scope && !scope.includes(propertyId)) notFound();

  const supabase = createServiceClient();
  const [{ data: property }, { data: rawItems }] = await Promise.all([
    supabase.from("properties").select("id, name").eq("id", propertyId).single<{ id: string; name: string }>(),
    supabase
      .from("inventory_items")
      .select("*, property_inventory(quantity, damaged_quantity, last_restocked_at)")
      .eq("property_id", propertyId)
      .is("archived_at", null)
      .order("category")
      .order("name"),
  ]);

  if (!property) notFound();

  // Prefer trigger-maintained property_inventory.quantity over the stale inventory_items.current_stock
  const items: InventoryItem[] = (rawItems ?? []).map((item) => {
    const pi = Array.isArray(item.property_inventory) ? item.property_inventory[0] : item.property_inventory;
    return {
      id: item.id,
      property_id: item.property_id,
      category: item.category,
      name: item.name,
      unit: item.unit,
      par_level: item.par_level,
      current_stock: pi?.quantity ?? item.current_stock,
    };
  });

  return <InventoryClient propertyId={propertyId} propertyName={property.name} initialItems={items} />;
}
