/* Shared skeleton wrapper — matches StayShell chrome */
export function SkeletonShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh" style={{ backgroundColor: "var(--jood-ground)" }}>
      {/* Page frame */}
      <div className="fixed pointer-events-none z-50" style={{ inset: "var(--frame-inset)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)" }} />

      {/* Header skeleton */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: "56px", borderBottom: "1px solid var(--jood-line)", backgroundColor: "rgba(245,244,237,0.75)", backdropFilter: "blur(20px)" }}>
        <div style={{ width: "60px", height: "22px", borderRadius: "var(--radius-sm)", background: "var(--jood-line)", animation: "sk-pulse 1.6s ease-in-out infinite" }} />
        <div style={{ width: "60px", height: "28px", borderRadius: "var(--radius-pill)", background: "var(--jood-line)", animation: "sk-pulse 1.6s ease-in-out infinite" }} />
      </header>

      <style>{`
        @keyframes sk-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .sk-bar { background: var(--jood-line); border-radius: var(--radius-sm); animation: sk-pulse 1.6s ease-in-out infinite; }
      `}</style>

      <div style={{ padding: "clamp(20px, 3vw, 36px) 24px 96px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {children}
      </div>
    </main>
  );
}

export function SkBar({ w = "100%", h = 18, delay = 0 }: { w?: string | number; h?: number; delay?: number }) {
  return (
    <div className="sk-bar" style={{ width: w, height: h, animationDelay: `${delay}ms` }} />
  );
}

export function SkCard({ h = 120, delay = 0 }: { h?: number; delay?: number }) {
  return (
    <div style={{ background: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)", padding: "20px", height: h, display: "flex", flexDirection: "column", gap: "12px", animation: "sk-pulse 1.6s ease-in-out infinite", animationDelay: `${delay}ms` }} />
  );
}
