import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { GuestRequestDetail } from "@/components/admin/RequestDetailClient";

interface Props { params: Promise<{ id: string }> }

export default async function GuestRequestDetailPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("guest_requests")
    .select("*, bookings(guest_first_name, guest_last_name, check_in, check_out, properties(name))")
    .eq("id", id)
    .single();

  if (!data) notFound();
  return <GuestRequestDetail request={data as never} />;
}
