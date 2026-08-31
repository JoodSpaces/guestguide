import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { getBookingFromToken } from "@/lib/guest-auth";
import Anthropic from "@anthropic-ai/sdk";

const schema = z.object({
  token: z.string(),
  query: z.string().min(2).max(300),
  locale: z.enum(["en", "ar"]).default("en"),
});

interface Entry {
  id: string;
  title_en: string;
  title_ar: string;
  body_en: string;
  body_ar: string;
}

interface SearchResult {
  answer: string | null;
  entryIds: string[];
}

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const booking = await getBookingFromToken(parsed.data.token);
  if (!booking) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: entries } = await supabase
    .from("property_content")
    .select("id, title_en, title_ar, body_en, body_ar")
    .eq("property_id", booking.property_id)
    .eq("is_published", true)
    .order("sort_order")
    .returns<Entry[]>();

  if (!entries?.length) {
    return NextResponse.json({ answer: null, entryIds: [] });
  }

  const isAr = parsed.data.locale === "ar";
  const lang = isAr ? "Arabic" : "English";

  const manualText = entries
    .map((e) => `[${e.id}] ${isAr ? e.title_ar : e.title_en}\n${isAr ? e.body_ar : e.body_en}`)
    .join("\n\n---\n\n");

  let result: SearchResult = { answer: null, entryIds: [] };

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: `You are a concierge assistant for a short-term rental property. You help guests find answers in the house manual. Always respond in ${lang}. Be concise and friendly.`,
      messages: [
        {
          role: "user",
          content: `House manual sections:\n\n${manualText}\n\n---\n\nGuest question: "${parsed.data.query}"\n\nReturn ONLY valid JSON with this shape: {"answer":"<2-3 sentence direct answer from the manual, or null if not covered>","entryIds":["<id>"]}\nList the 1-3 most relevant section IDs. If the manual does not cover this question set answer to null and entryIds to [].`,
        },
      ],
    });

    const block = response.content[0];
    if (block.type === "text") {
      const raw = block.text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
      const parsed2 = JSON.parse(raw) as Partial<SearchResult>;
      result = {
        answer: typeof parsed2.answer === "string" ? parsed2.answer : null,
        entryIds: Array.isArray(parsed2.entryIds)
          ? parsed2.entryIds.filter((id) => entries.some((e) => e.id === id))
          : [],
      };
    }
  } catch {
    // Fail gracefully — client falls back to keyword results
  }

  return NextResponse.json(result);
}
