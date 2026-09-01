import { SkeletonShell, SkBar, SkCard } from "@/components/ui/SkeletonShell";

export default function Loading() {
  return (
    <SkeletonShell>
      <SkBar w="25%" h={10} delay={0} />
      <SkBar w="50%" h={32} delay={60} />
      <div style={{ height: "48px", background: "var(--jood-surface)", borderRadius: "var(--radius-pill)", border: "1px solid var(--jood-line)", animation: "sk-pulse 1.6s ease-in-out infinite", animationDelay: "100ms" }} />
      <SkCard h={72} delay={160} />
      {[200, 260, 320, 380].map((d) => (
        <div key={d} style={{ background: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)", padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", animation: "sk-pulse 1.6s ease-in-out infinite", animationDelay: `${d}ms` }}>
          <SkBar w="50%" h={15} />
          <SkBar w={14} h={14} />
        </div>
      ))}
    </SkeletonShell>
  );
}
