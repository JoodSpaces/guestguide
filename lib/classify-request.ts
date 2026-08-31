import Anthropic from "@anthropic-ai/sdk";

export type GuestRequestCategory = "maintenance" | "housekeeping" | "supplies" | "service" | "other";
export type GuestRequestUrgency = "normal" | "urgent";

export interface RequestClassification {
  category: GuestRequestCategory;
  urgency: GuestRequestUrgency;
}

const VALID_CATEGORIES: GuestRequestCategory[] = ["maintenance", "housekeeping", "supplies", "service", "other"];
const VALID_URGENCIES: GuestRequestUrgency[] = ["normal", "urgent"];

const FALLBACK: RequestClassification = { category: "other", urgency: "normal" };

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) _client = new Anthropic();
  return _client;
}

export async function classifyGuestRequest(text: string): Promise<RequestClassification> {
  const response = await getClient().messages.create({
    // claude-haiku-4-5: fast, cheap, sufficient for short-text classification
    model: "claude-haiku-4-5",
    max_tokens: 64,
    system: `Classify hotel guest requests. Reply ONLY with valid JSON: {"category":"...","urgency":"..."}
Categories: maintenance (broken/faulty items, AC, plumbing, electrical, leaks), housekeeping (cleaning, linens, towels, trash), supplies (toiletries, water, coffee, amenities), service (food delivery, transport, activities, reservations), other.
Urgency: "urgent" only for safety risks, being locked out, flooding, or truly time-critical issues. Everything else is "normal".`,
    messages: [{ role: "user", content: text.slice(0, 500) }],
  });

  const block = response.content[0];
  if (block.type !== "text") return FALLBACK;

  try {
    const raw = block.text.trim();
    const parsed = JSON.parse(raw) as Partial<RequestClassification>;
    return {
      category: VALID_CATEGORIES.includes(parsed.category as GuestRequestCategory)
        ? (parsed.category as GuestRequestCategory)
        : "other",
      urgency: VALID_URGENCIES.includes(parsed.urgency as GuestRequestUrgency)
        ? (parsed.urgency as GuestRequestUrgency)
        : "normal",
    };
  } catch {
    return FALLBACK;
  }
}
