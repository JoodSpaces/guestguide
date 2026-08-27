import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ id: string }>;
}

const SECTION_LABELS: Record<string, string> = {
  wifi: "Wi-Fi",
  ac: "AC & Heating",
  pool: "Pool & Outdoor",
  rules: "House Rules",
  emergency: "Emergency Contacts",
  kitchen: "Kitchen",
  parking: "Parking",
  checkin: "Check-in",
  checkout: "Check-out",
  appliances: "Appliances",
  trash: "Trash",
  quiet: "Quiet Hours",
  pets: "Pets",
  smoking: "Smoking",
};

const card: React.CSSProperties = {
  backgroundColor: "var(--jood-surface)",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-lg)",
  padding: "20px 24px",
  marginBottom: "12px",
};

export default async function PropertyGuidePage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = createServiceClient();

  const [{ data: property }, { data: content }] = await Promise.all([
    supabase
      .from("properties")
      .select("id, name, name_ar, slug")
      .eq("id", id)
      .single<{ id: string; name: string; name_ar: string; slug: string }>(),
    supabase
      .from("property_content")
      .select("id, section, sort_order, title_en, title_ar, body_en, body_ar, is_published")
      .eq("property_id", id)
      .order("sort_order", { ascending: true })
      .returns<{
        id: string;
        section: string;
        sort_order: number;
        title_en: string;
        title_ar: string;
        body_en: string;
        body_ar: string;
        is_published: boolean;
      }[]>(),
  ]);

  if (!property) notFound();

  return (
    <div>
      {/* Back — try to go back to the referring booking if possible */}
      <a
        href="/admin/bookings"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          color: "var(--jood-ink-muted)",
          textDecoration: "none",
          fontSize: "0.8125rem",
          marginBottom: "24px",
        }}
      >
        ← Bookings
      </a>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <p
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "0.7rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--jood-ink-muted)",
              marginBottom: "6px",
            }}
          >
            Unit guide
          </p>
          <h1 className="font-display" style={{ fontSize: "1.8rem", lineHeight: 1.1 }}>
            {property.name}
          </h1>
          {property.name_ar && (
            <p style={{ fontFamily: "var(--font-arabic)", fontSize: "1rem", color: "var(--jood-ink-muted)", marginTop: "4px" }} dir="rtl">
              {property.name_ar}
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--jood-ink-muted)",
            }}
          >
            {content?.length ?? 0} sections
          </span>
          <a
            href={`/admin/properties/${id}/guide/edit`}
            style={{
              padding: "8px 16px",
              backgroundColor: "var(--jood-ink)",
              color: "var(--jood-ground)",
              borderRadius: "var(--radius-pill)",
              textDecoration: "none",
              fontSize: "0.8125rem",
              fontFamily: "var(--font-label)",
              letterSpacing: "0.06em",
            }}
          >
            Edit guide
          </a>
        </div>
      </div>

      {!content?.length && (
        <div style={{ ...card, color: "var(--jood-ink-muted)", textAlign: "center", padding: "40px" }}>
          No content sections yet for this property.
        </div>
      )}

      {content?.map((item) => (
        <div key={item.id} style={{ ...card, opacity: item.is_published ? 1 : 0.5 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  fontFamily: "var(--font-label)",
                  fontSize: "9px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--jood-accent)",
                  backgroundColor: "rgba(255,96,55,0.08)",
                  borderRadius: "var(--radius-pill)",
                  padding: "3px 9px",
                }}
              >
                {SECTION_LABELS[item.section] ?? item.section}
              </span>
              {!item.is_published && (
                <span
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--jood-ink-muted)",
                    border: "1px solid var(--jood-line)",
                    borderRadius: "var(--radius-pill)",
                    padding: "3px 9px",
                  }}
                >
                  Hidden
                </span>
              )}
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--jood-ink-ghost)" }}>
              #{item.sort_order}
            </span>
          </div>

          <h2 className="font-display" style={{ fontSize: "1.1rem", marginBottom: "8px", color: "var(--jood-ink)" }}>
            {item.title_en}
          </h2>
          {item.title_ar && (
            <p dir="rtl" style={{ fontFamily: "var(--font-arabic)", fontSize: "0.9375rem", color: "var(--jood-ink-muted)", marginBottom: "10px" }}>
              {item.title_ar}
            </p>
          )}

          <div style={{ borderTop: "1px solid var(--jood-line)", paddingTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <p style={{ fontFamily: "var(--font-label)", fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "6px" }}>English</p>
              <p style={{ fontSize: "0.875rem", color: "var(--jood-ink)", lineHeight: 1.6 }}>{item.body_en}</p>
            </div>
            <div dir="rtl">
              <p style={{ fontFamily: "var(--font-label)", fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "6px" }}>عربي</p>
              <p style={{ fontFamily: "var(--font-arabic)", fontSize: "0.875rem", color: "var(--jood-ink)", lineHeight: 1.7 }}>{item.body_ar}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
