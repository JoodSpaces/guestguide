import { createServiceClient } from "@/lib/supabase/server";
import { computePhase } from "@/lib/token";
import { hhmm } from "@/lib/time";
import type { GuestBooking } from "@/lib/guest-auth";

const MANUAL_CHARS = 7000;

/**
 * What the voice agent is told about this guest and house, sent once as a contextual update when the call connects.
 * The door code and the Wi-Fi password are never included: they go to an outside provider, so the agent points the
 * guest to the screen that shows them instead.
 */
export async function buildVoiceContext(booking: GuestBooking, locale: "en" | "ar") {
  const supabase = createServiceClient();
  const isAr = locale === "ar";
  const [{ data: property }, { data: entries }] = await Promise.all([
    supabase.from("properties").select("name, name_ar, wifi_ssid, checkin_time, checkout_time").eq("id", booking.property_id)
      .single<{ name: string; name_ar: string | null; wifi_ssid: string | null; checkin_time: string; checkout_time: string }>(),
    supabase.from("property_content").select("title_en, title_ar, body_en, body_ar").eq("property_id", booking.property_id)
      .eq("is_published", true).order("sort_order")
      .returns<{ title_en: string; title_ar: string | null; body_en: string; body_ar: string | null }[]>(),
  ]);

  const propertyName = (isAr ? property?.name_ar : property?.name) ?? property?.name ?? "";
  const phase = computePhase(booking.check_in, booking.check_out);
  const cairoNow = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", hour12: false }).format(new Date())) % 24;
  const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { timeZone: "Africa/Cairo", weekday: "long", day: "numeric", month: "long" });

  const manual = (entries ?? [])
    .map((e) => `### ${(isAr ? e.title_ar : e.title_en) || e.title_en}\n${(isAr ? e.body_ar : e.body_en) || e.body_en}`)
    .join("\n\n")
    .slice(0, MANUAL_CHARS) || "No house guide has been written for this property yet.";

  const text = [
    "STAY CONTEXT (private, do not read this out).",
    `Guest first name: ${booking.guest_first_name}. Property: ${propertyName}.`,
    `Check-in: ${day(booking.check_in)} at ${hhmm(property?.checkin_time, "15:00")}. Check-out: ${day(booking.check_out)} at ${hhmm(property?.checkout_time, "11:00")}.`,
    `Stay stage: ${phase}. Local time in Cairo: ${cairoNow}.`,
    `The guest's app is in ${isAr ? "Arabic: speak Arabic unless they switch" : "English: speak English unless they switch"}.`,
    hour >= 23 || hour < 6 ? "It is late at night: keep every answer to one or two short sentences." : "",
    property?.wifi_ssid ? `Wi-Fi network name: ${property.wifi_ssid}. The password and the door code are NOT available to you: say they are on the House guide and Door code screens, and offer to open that screen with open_screen.` : "The door code and Wi-Fi password are NOT available to you: offer to open the Door code or House guide screen with open_screen.",
    "",
    "TOOLS: use report_problem for anything broken, unsafe or urgent; request_service when the guest wants something added (late check-out, transfer, meals, extra cleaning), never promise a price or that it is approved; message_team for anything you cannot do; open_screen to show a screen; flag_unanswered whenever you do not know the answer. After a tool succeeds, tell the guest in one short sentence what was sent.",
    "LOOKUP TOOLS (read-only, call them instead of guessing): get_services {query?} for the menu, prices and notice times; get_request_status for whether the guest's earlier requests were picked up or done; get_nearby {category?} for JOOD's local recommendations; get_my_stay for nights left and times; search_house_guide {query} for any house question not answered below. Never invent prices, places or availability that a lookup did not return. Late check-out and extensions: never promise, use request_service.",
    "LATE CHECK-OUT: when the guest asks to leave later, first call check_late_checkout {until} with a 24-hour time like 15:00; it checks the real calendar. Offer only what it says, then call request_service (service \"Late check-out\", details \"until HH:MM\") if the guest wants it, and say the team will confirm. EXTENDING THE STAY: when the guest wants to stay longer, call check_extension {nights} (a whole number of extra nights after their check-out). It checks the calendar and gives an estimated room price. Quote only what it returns, never promise, never send payment links: if the guest wants it, call request_service (service \"Extend stay\") and say the team will confirm and arrange payment. EMERGENCIES: gas smell, fire, flooding, electrical danger, a medical emergency, being locked out or a safety threat: call report_emergency {kind: gas|fire|flood|electrical|medical|lockout|security|other, details} IMMEDIATELY, before anything else, then give the safety instruction it returns in short calm sentences. Never use report_problem for these.",
    "",
    "HOUSE GUIDE (only state facts found here; if it is not here, call flag_unanswered and offer to message the team):",
    manual,
  ].filter((l) => l !== null).join("\n");

  return { text, propertyName };
}
