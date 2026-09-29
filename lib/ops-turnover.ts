import type { SupabaseClient } from "@supabase/supabase-js";
import { buildChecklist, DEFAULT_CHECKLIST, type PropertySpecs } from "@/lib/ops-checklist";

/**
 * Every booking gets a scheduled turnover (the cleaning after check-out) with the
 * property's checklist, so the ops team can plan ahead. Shared by the admin
 * "new booking" route and the website bridge.
 */
export async function createScheduledTurnover(
  supabase: SupabaseClient,
  bookingId: string,
  propertyId: string,
  specs: PropertySpecs | null | undefined,
): Promise<void> {
  const { data: task } = await supabase
    .from("turnover_tasks")
    .insert({ booking_id: bookingId, property_id: propertyId, status: "scheduled" })
    .select("id")
    .single<{ id: string }>();
  if (!task) return;

  const checklist =
    specs && Array.isArray(specs.rooms) && specs.rooms.length > 0 ? buildChecklist(specs) : DEFAULT_CHECKLIST;
  await supabase.from("turnover_items").insert(
    checklist.map((item) => ({
      task_id: task.id,
      room: item.room,
      label: item.label,
      sort_order: item.sort_order,
    })),
  );
}
