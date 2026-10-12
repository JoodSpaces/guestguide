import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden, checkPropertyAccess } from "@/lib/admin-auth";
import { allow, type RateRule } from "@/lib/rate-limit";
import { computePhase } from "@/lib/token";
import { draftReply, type DraftLang } from "@/lib/reply-draft";

const RULE: RateRule = { name: "admin-reply-draft", limit: 40, windowSec: 300 };

/** POST: a suggested reply to this guest request, in the guest's language. Read-only: nothing is saved or sent. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(req, ["admin", "ops", "concierge"]);
  if (!session) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  if (!(await allow(RULE, session.id))) return NextResponse.json({ error: "slow_down" }, { status: 429 });

  const supabase = createServiceClient();
  const { data: r } = await supabase
    .from("guest_requests")
    .select("id, body, category, urgency, status, bookings(property_id, guest_first_name, guest_lang, check_in, check_out, properties(name, name_ar))")
    .eq("id", id)
    .single<{
      id: string; body: string; category: string; urgency: "normal" | "urgent"; status: string;
      bookings: { property_id: string; guest_first_name: string; guest_lang: string; check_in: string; check_out: string;
                  properties: { name: string; name_ar: string | null } | { name: string; name_ar: string | null }[] } | null;
    }>();
  const b = r?.bookings;
  if (!r || !b) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!checkPropertyAccess(session, b.property_id)) return forbidden();

  const lang: DraftLang = b.guest_lang === "ar" ? "ar" : "en";
  const prop = Array.isArray(b.properties) ? b.properties[0] : b.properties;
  const { data: entries } = await supabase.from("property_content").select("title_en, title_ar, body_en, body_ar")
    .eq("property_id", b.property_id).eq("is_published", true).order("sort_order")
    .returns<{ title_en: string; title_ar: string | null; body_en: string; body_ar: string | null }[]>();
  const guide = (entries ?? []).map((e) => `### ${(lang === "ar" ? e.title_ar : e.title_en) || e.title_en}\n${(lang === "ar" ? e.body_ar : e.body_en) || e.body_en}`).join("\n\n").slice(0, 4000);

  const out = await draftReply({
    lang, firstName: b.guest_first_name, propertyName: (lang === "ar" ? prop?.name_ar : prop?.name) ?? prop?.name ?? "",
    requestBody: r.body, category: r.category, urgency: r.urgency, status: r.status, stage: computePhase(b.check_in, b.check_out), guide,
  });
  return NextResponse.json({ draft: out.text, ai: out.ai, lang });
}
