import { describe, expect, it } from "vitest";
import scenarios from "../evals/voice-scenarios.json";
import { VOICE_READ_TOOLS } from "@/lib/voice-tools";

type Scenario = { id: string; tools?: string[]; must?: string[]; must_not?: string[] };
const list = scenarios.scenarios as Scenario[];
const ACTION_TOOLS = ["check_late_checkout", "report_emergency", "check_extension", "start_extension"];

describe("concierge eval scenarios", () => {
  it("have unique ids and something to check", () => {
    expect(new Set(list.map((s) => s.id)).size).toBe(list.length);
    for (const s of list) expect((s.must?.length ?? 0) + (s.must_not?.length ?? 0) + (s.tools?.length ?? 0)).toBeGreaterThan(0);
  });
  it("only name tools that exist", () => {
    const known = new Set<string>([...VOICE_READ_TOOLS, ...ACTION_TOOLS]);
    for (const s of list) for (const t of s.tools ?? []) expect(known.has(t), `${s.id}: ${t}`).toBe(true);
  });
  it("cover every tool at least once", () => {
    const used = new Set(list.flatMap((s) => s.tools ?? []));
    for (const t of [...VOICE_READ_TOOLS, ...ACTION_TOOLS]) expect(used.has(t), t).toBe(true);
  });
});
