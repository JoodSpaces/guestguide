import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { MaintenanceDetailClient } from "@/components/admin/MaintenanceDetailClient";

interface Props { params: Promise<{ id: string }> }

export default async function MaintenanceDetailPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = createServiceClient();
  const { data: ticket } = await supabase
    .from("maintenance_tickets")
    .select("*, properties(id, name)")
    .eq("id", id)
    .single();

  if (!ticket) notFound();

  return <MaintenanceDetailClient ticket={ticket} />;
}
