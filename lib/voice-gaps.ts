import { tokens } from "@/lib/voice-tools";

/**
 * Questions the voice agent could not answer, grouped so the same gap asked three different ways is one item to fix.
 * Two questions about the same property are "the same" when their meaningful words overlap by at least half.
 */
export interface GapItem { q: string; propertyId: string; propertyName: string; at: string; who: string }
export interface GapGroup { propertyId: string; propertyName: string; questions: string[]; asked: number; lastAt: string; who: string[] }

const overlap = (a: Set<string>, b: Set<string>): number => {
  if (!a.size || !b.size) return 0;
  let n = 0; for (const w of a) if (b.has(w)) n++;
  return n / Math.min(a.size, b.size);
};

export function groupGaps(items: GapItem[], threshold = 0.5): GapGroup[] {
  const groups: (GapGroup & { sets: Set<string>[] })[] = [];
  for (const it of [...items].sort((x, y) => (x.at < y.at ? 1 : -1))) {
    const set = new Set(tokens(it.q));
    const g = groups.find((x) => x.propertyId === it.propertyId && x.sets.some((s) => overlap(s, set) >= threshold && set.size > 0));
    if (g) {
      g.asked++;
      if (!g.questions.includes(it.q)) { g.questions.push(it.q); g.sets.push(set); }
      if (it.who && !g.who.includes(it.who)) g.who.push(it.who);
    } else {
      groups.push({ propertyId: it.propertyId, propertyName: it.propertyName, questions: [it.q], asked: 1, lastAt: it.at, who: it.who ? [it.who] : [], sets: [set] });
    }
  }
  return groups.map(({ sets: _s, ...g }) => g).sort((a, b) => b.asked - a.asked || (a.lastAt < b.lastAt ? 1 : -1));
}
