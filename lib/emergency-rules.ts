import type { EmergencyKind } from "@/lib/voice-actions";

/**
 * Deterministic emergency detection. The model may read language, but what counts as an emergency is decided here, so
 * it works with no AI key, cannot be talked out of, and is the same for text and voice. English and Arabic.
 * Deliberately a little eager: a false alarm costs the team a phone call, a miss costs far more.
 */
const RULES: { kind: EmergencyKind; re: RegExp }[] = [
  { kind: "gas", re: /\b(smell(s|ing)?\s+(of\s+)?gas|gas\s+(leak|smell)|leaking\s+gas)\b|ريحة\s*غاز|رائحة\s*غاز|تسرب\s*(ال)?غاز|غاز\s*(بيسرب|يتسرب)/i },
  { kind: "fire", re: /\b(fire|smoke|smoking|burning smell|something(?:'s| is) burning|caught fire|on fire)\b|حريق|نار\b|دخان|بيولع|ولعت|رائحة\s*حريق/i },
  { kind: "flood", re: /\b(flood(ed|ing)?|water\s+(is\s+)?(pouring|gushing|everywhere)|pipe\s+(burst|has burst)|burst\s+pipe|overflowing)\b|غرق|فيضان|ماسورة\s*(انفجرت|مفتوحة)|المياه\s*(في\s*كل\s*مكان|بتغرق)/i },
  { kind: "electrical", re: /\b(electric(al)?\s+shock|electrocut|sparks?|sparking|short[\s-]?circuit|socket\s+(is\s+)?(burning|smoking))\b|صعقة|كهرباء\s*(ماسكة|بتشرر)|شرار|ماس\s*كهربائي|ماس\s*كهربا/i },
  { kind: "medical", re: /\b(ambulance|heart attack|can'?t breathe|cannot breathe|not breathing|unconscious|passed out|seizure|bleeding (heavily|badly)|severe(ly)? (hurt|injur)|choking|overdose|chest pain)\b|إسعاف|اسعاف|مش\s*قادر\s*اتنفس|فاقد\s*الوعي|أغمي\s*عليه|نزيف|ألم\s*في\s*الصدر|ازمة\s*قلبية|أزمة\s*قلبية/i },
  { kind: "lockout", re: /\b(locked\s+out|can'?t\s+(get|go)\s+in(side)?|stuck\s+outside|door\s+(won'?t|will not)\s+open|lost\s+(my\s+)?(key|keys|key\s*card))\b|مقفول\s*عليا\s*برا|اتقفل\s*الباب|مش\s*عارف\s*ادخل|ضاع\s*المفتاح|ضيعت\s*المفتاح|محبوس\s*برة/i },
  { kind: "security", re: /\b(break[\s-]?in|burglar|intruder|someone\s+(is\s+)?(in|trying to get into)\s+(the\s+)?(house|apartment|flat)|being\s+(followed|threatened)|robbed|stolen from)\b|حرامي|سرقة|اقتحام|شخص\s*غريب\s*(جوه|داخل)|بيهددني/i },
];

export function detectEmergency(text: string): EmergencyKind | null {
  const t = text.slice(0, 1000);
  for (const r of RULES) if (r.re.test(t)) return r.kind;
  return null;
}
