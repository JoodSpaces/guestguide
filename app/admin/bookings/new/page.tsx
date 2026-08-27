import { createServiceClient } from "@/lib/supabase/server";
import { NewBookingForm } from "@/components/admin/NewBookingForm";

export default async function NewBookingPage() {
  const supabase = createServiceClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, slug")
    .order("name")
    .returns<{ id: string; name: string; slug: string }[]>();

  return (
    <div style={{ maxWidth: "560px" }}>
      <h1 className="font-display" style={{ fontSize: "1.8rem", marginBottom: "8px" }}>
        New booking
      </h1>
      <p style={{ color: "var(--jood-ink-muted)", marginBottom: "32px", fontSize: "0.9375rem" }}>
        Creates a guest link automatically. Send it to the guest however you like.
      </p>
      <NewBookingForm properties={properties ?? []} />
    </div>
  );
}
