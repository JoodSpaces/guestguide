import { SkeletonShell, SkBar, SkCard } from "@/components/ui/SkeletonShell";

export default function Loading() {
  return (
    <SkeletonShell>
      <SkBar w="30%" h={10} delay={0} />
      <SkBar w="65%" h={36} delay={60} />
      <SkCard h={160} delay={120} />
      <SkCard h={180} delay={200} />
      <SkCard h={72} delay={280} />
    </SkeletonShell>
  );
}
