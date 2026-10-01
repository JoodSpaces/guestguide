import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden } from "@/lib/admin-auth";

const schema = z.object({
  propertyId: z.string().uuid(),
  questions: z.array(z.string().max(300)).min(1).max(30),
  action: z.enum(["answer", "dismiss"]),
  titleEn: z.string().max(120).optional(),
  bodyEn: z.string().max(4000).optional(),
  titleAr: z.string().max(120).optional(),
  bodyAr: z.string().max(4000).optional(),
});

/**
 * Resolve a gap the voice agent reported. "answer" adds a published house-guide entry (so the agent and the guide screen both
 * know it from now on); both actions then clear those questions from the logged conversations of that property.
 */
export async function POST(req: NextRequest) {
  if (!(await requireSession(req, ["admin"]))) return forbidden();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });
  const d = parsed.data;
  const supabase = createServiceClient();

  if (d.action === "answer") {
    if (!d.titleEn?.trim() || !d.bodyEn?.trim()) return NextResponse.json({ error: "title_and_answer_required" }, { status: 400 });
    const { data: last } = await supabase.from("property_content").select("sort_order").eq("property_id", d.propertyId)
      .order("sort_order", { ascending: false }).limit(1).returns<{ sort_order: number }[]>();
    const { error } = await supabase.from("property_content").insert({
      property_id: d.propertyId, section: "faq", sort_order: (last?.[0]?.sort_order ?? 0) + 1,
      title_en: d.titleEn.trim(), body_en: d.bodyEn.trim(), title_ar: d.titleAr?.trim() ?? "", body_ar: d.bodyAr?.trim() ?? "", is_published: true,
    });
    if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const { data: sessions } = await supabase.from("voice_sessions").select("id, unanswered, bookings!inner(property_id)")
    .eq("bookings.property_id", d.propertyId).not("unanswered", "eq", "{}").limit(500).returns<{ id: string; unanswered: string[] }[]>();
  const drop = new Set(d.questions);
  let cleared = 0;
  for (const s of sessions ?? []) {
    const keep = s.unanswered.filter((q) => !drop.has(q));
    if (keep.length !== s.unanswered.length) {
      await supabase.from("voice_sessions").update({ unanswered: keep }).eq("id", s.id);
      cleared++;
    }
  }
  return NextResponse.json({ ok: true, cleared });
}
