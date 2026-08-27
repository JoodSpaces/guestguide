import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { GuideEditor } from "@/components/admin/GuideEditor";
import type { ContentSection } from "@/components/admin/GuideEditor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GuideEditPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = createServiceClient();

  const [{ data: property }, { data: content }] = await Promise.all([
    supabase
      .from("properties")
      .select("id, name, name_ar")
      .eq("id", id)
      .single<{ id: string; name: string; name_ar: string }>(),
    supabase
      .from("property_content")
      .select("id, section, sort_order, title_en, title_ar, body_en, body_ar, is_published")
      .eq("property_id", id)
      .order("sort_order", { ascending: true })
      .returns<ContentSection[]>(),
  ]);

  if (!property) notFound();

  return (
    <GuideEditor
      propertyId={id}
      propertyName={property.name}
      initialSections={content ?? []}
    />
  );
}
