import { NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { getBookingFromToken } from "@/lib/guest-auth";
import { computePhase } from "@/lib/token";
import Anthropic from "@anthropic-ai/sdk";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(2000),
});

const schema = z.object({
  token: z.string(),
  messages: z.array(messageSchema).min(1).max(20),
  locale: z.enum(["en", "ar"]).default("en"),
});

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const booking = await getBookingFromToken(parsed.data.token);
  if (!booking) return new Response("Unauthorized", { status: 401 });

  if (parsed.data.messages.at(-1)?.role !== "user") {
    return new Response("Last message must be from user", { status: 400 });
  }

  const supabase = createServiceClient();

  const [{ data: property }, { data: entries }] = await Promise.all([
    supabase
      .from("properties")
      .select("name, name_ar, wifi_ssid, checkin_time, checkout_time")
      .eq("id", booking.property_id)
      .single<{
        name: string; name_ar: string;
        wifi_ssid: string | null;
        checkin_time: string; checkout_time: string;
      }>(),
    supabase
      .from("property_content")
      .select("title_en, title_ar, body_en, body_ar")
      .eq("property_id", booking.property_id)
      .eq("is_published", true)
      .order("sort_order")
      .returns<{ title_en: string; title_ar: string; body_en: string; body_ar: string }[]>(),
  ]);

  if (!property) return new Response("Not found", { status: 404 });

  const isAr = parsed.data.locale === "ar";
  const propertyName = isAr ? property.name_ar : property.name;
  const phase = computePhase(booking.check_in, booking.check_out);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(isAr ? "ar-EG" : "en-GB", {
      weekday: "long", day: "numeric", month: "long",
    });

  const phaseNote: Record<string, string> = {
    anticipation: isAr ? "الضيف لم يصل بعد." : "Guest has not yet arrived.",
    preparation:  isAr ? "الضيف سيصل قريباً." : "Guest arrives soon.",
    arrival:      isAr ? "يوم وصول الضيف."   : "Guest arrival day.",
    settling:     isAr ? "الضيف وصل للتو."   : "Guest just arrived.",
    living:       isAr ? "إقامة جارية."       : "Mid-stay.",
    departure:    isAr ? "يوم المغادرة."      : "Departure day.",
    afterglow:    isAr ? "الضيف غادر."        : "Guest has departed.",
  };

  const manualText = entries?.length
    ? entries
        .map((e) => `### ${isAr ? e.title_ar : e.title_en}\n${isAr ? e.body_ar : e.body_en}`)
        .join("\n\n")
    : (isAr ? "لا يوجد دليل حالياً." : "No manual content yet.");

  // WiFi password is intentionally excluded from the AI prompt — it is served
  // directly from the stay page to avoid sending credentials to external APIs.
  const wifiLine = property.wifi_ssid
    ? (isAr ? `- الواي فاي: ${property.wifi_ssid}` : `- WiFi SSID: ${property.wifi_ssid} (password shown on your stay page)`)
    : "";

  const systemPrompt = isAr
    ? `أنت "كونسيرج جود"، مساعد ذكاء اصطناعي للضيوف في ${propertyName}. أجب دائماً بالعربية.

## تفاصيل الإقامة
- الوصول: ${fmt(booking.check_in)} في ${property.checkin_time}
- المغادرة: ${fmt(booking.check_out)} في ${property.checkout_time}
- الحالة: ${phaseNote[phase] ?? ""}
${wifiLine}

## دليل العقار
${manualText}

## إرشادات
- كن دافئاً وموجزاً (أقل من 120 كلمة ما لم يكن التفصيل ضرورياً).
- للمشاكل التشغيلية أو الطلبات الخاصة، اقترح صفحة الطلبات للتواصل مع فريق جود.
- لا تخترع معلومات غير موجودة في الدليل أعلاه.`
    : `You are JOOD Concierge, an AI assistant for guests staying at ${propertyName}. Always respond in English.

## Stay Details
- Check-in: ${fmt(booking.check_in)} at ${property.checkin_time}
- Check-out: ${fmt(booking.check_out)} at ${property.checkout_time}
- Status: ${phaseNote[phase] ?? ""}
${wifiLine}

## Property Manual
${manualText}

## Guidelines
- Be warm and concise (under 120 words unless detail is genuinely needed).
- For operational issues or special requests, suggest the Requests screen to reach the JOOD team.
- Never invent information not in the manual above.`;

  let stream;
  try {
    stream = client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: parsed.data.messages.map((m) => ({ role: m.role, content: m.content })),
    });
  } catch (err) {
    console.error("[concierge] stream init error:", err);
    return new Response("AI unavailable", { status: 502 });
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        console.error("[concierge] stream error:", err);
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
