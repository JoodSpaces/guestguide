/** Turning a guest request into a maintenance ticket: a sensible title and category from the guest's own words. */

export type TicketCategory = "plumbing" | "electrical" | "ac" | "appliance" | "furniture" | "pool" | "structural" | "general";

const RULES: Array<[TicketCategory, RegExp]> = [
  ["ac",         /\b(a\/?c|air[- ]?con(ditioner|ditioning)?|cooling|heating|thermostat)\b|مكيف|تكييف/i],
  ["plumbing",   /\b(leak\w*|toilet|shower|sink|tap|faucet|drain\w*|water pressure|no hot water|flood\w*)\b|تسريب|حمام|سباكة|مياه/i],
  ["electrical", /\b(light\w*|bulb|power|socket|outlet|electric\w*|fuse|breaker|switch)\b|كهرباء|إضاءة|لمبة/i],
  ["pool",       /\b(pool|jacuzzi|hot tub)\b|حمام سباحة|مسبح/i],
  ["appliance",  /\b(fridge|refrigerator|oven|stove|washing machine|washer|dryer|dishwasher|microwave|kettle|tv|television)\b|ثلاجة|غسالة|فرن|تلفزيون/i],
  ["furniture",  /\b(chair|table|bed|sofa|couch|wardrobe|drawer|mattress)\b|كرسي|سرير|كنبة|دولاب/i],
  ["structural", /\b(door|window|lock|key|ceiling|wall|floor|roof|crack\w*)\b|باب|شباك|نافذة|قفل|سقف|حائط/i],
];

export function guessTicketCategory(text: string): TicketCategory {
  for (const [cat, re] of RULES) if (re.test(text)) return cat;
  return "general";
}

/** First sentence, trimmed to a readable title. */
export function ticketTitle(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const first = flat.split(/(?<=[.!?؟])\s/)[0] ?? flat;
  return first.length <= 80 ? first : first.slice(0, 77).trimEnd() + "…";
}
