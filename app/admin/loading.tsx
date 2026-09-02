export default function AdminLoading() {
  return (
    <div
      style={{
        padding: "32px 24px",
        maxWidth: "900px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        animation: "sk-pulse 1.5s ease-in-out infinite",
      }}
    >
      <style>{`@keyframes sk-pulse{0%,100%{opacity:.45}50%{opacity:.9}}`}</style>
      {/* Page title bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ width: "180px", height: "28px", background: "var(--jood-line)", borderRadius: "6px" }} />
        <div style={{ width: "110px", height: "34px", background: "var(--jood-line)", borderRadius: "8px" }} />
      </div>
      {/* Filter/search row */}
      <div style={{ display: "flex", gap: "10px" }}>
        <div style={{ flex: 1, height: "36px", background: "var(--jood-line)", borderRadius: "8px" }} />
        <div style={{ width: "90px", height: "36px", background: "var(--jood-line)", borderRadius: "8px" }} />
      </div>
      {/* Table skeleton */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            height: "52px",
            background: "var(--jood-surface)",
            border: "1px solid var(--jood-line)",
            borderRadius: "10px",
            animationDelay: `${i * 60}ms`,
          }}
        />
      ))}
    </div>
  );
}
