import { SkeletonShell, SkBar, SkCard } from "@/components/ui/SkeletonShell";

export default function Loading() {
  return (
    <SkeletonShell>
      {/* Ask bar */}
      <div style={{ height: "48px", background: "var(--jood-surface)", borderRadius: "var(--radius-pill)", border: "1px solid var(--jood-line)", animation: "sk-pulse 1.6s ease-in-out infinite" }} />
      {/* Chips */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {[60, 48, 72, 56, 64, 50].map((w, i) => (
          <div key={i} style={{ width: w, height: 30, borderRadius: "var(--radius-pill)", background: "var(--jood-line)", animation: "sk-pulse 1.6s ease-in-out infinite", animationDelay: `${i * 40}ms` }} />
        ))}
      </div>
      {/* Section */}
      <SkBar w="30%" h={11} delay={200} />
      <div style={{ display: "flex", gap: "10px", overflowX: "hidden" }}>
        {[0, 80, 160].map((d) => <SkCard key={d} h={130} delay={d} />)}
      </div>
      <SkBar w="25%" h={11} delay={300} />
      <div style={{ display: "flex", gap: "10px", overflowX: "hidden" }}>
        {[0, 80].map((d) => <SkCard key={d} h={130} delay={d} />)}
      </div>
    </SkeletonShell>
  );
}
