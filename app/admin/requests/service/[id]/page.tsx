import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { ServiceRequestDetail } from "@/components/admin/RequestDetailClient";

interface Props { params: Promise<{ id: string }> }

export default async function ServiceRequestDetailPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("service_requests")
    .select("*, services(*), bookings(id, guest_first_name, guest_last_name, guest_email, properties(name))")
    .eq("id", id)
    .single();

  if (!data) notFound();
  return <ServiceRequestDetail request={data as never} />;
}
