import { SkeletonShell, SkBar, SkCard } from "@/components/ui/SkeletonShell";

export default function Loading() {
  return (
    <SkeletonShell>
      {/* Hero block */}
      <div style={{ height: "200px", background: "var(--jood-surface)", borderRadius: "var(--radius-lg)", marginBottom: "4px", animation: "sk-pulse 1.6s ease-in-out infinite" }} />
      {/* Greeting */}
      <SkBar w="55%" h={28} delay={80} />
      <SkBar w="40%" h={16} delay={120} />
      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
        <SkCard h={110} delay={160} />
        <SkCard h={110} delay={200} />
        <SkCard h={110} delay={240} />
        <SkCard h={110} delay={280} />
      </div>
    </SkeletonShell>
  );
}
