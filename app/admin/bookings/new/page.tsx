import { createServiceClient } from "@/lib/supabase/server";
import { NewBookingForm } from "@/components/admin/NewBookingForm";
import { BackLink } from "@/components/admin/BackLink";

export default async function NewBookingPage() {
  const supabase = createServiceClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, slug")
    .order("name")
    .returns<{ id: string; name: string; slug: string }[]>();

  return (
    <div style={{ maxWidth: "560px" }}>
      <BackLink
        fallbackHref="/admin/bookings"
        style={{ display: "inline-flex", color: "var(--jood-ink-muted)", textDecoration: "none", fontSize: "0.8125rem", marginBottom: "20px" }}
      />
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
