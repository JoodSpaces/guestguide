"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.replace("/admin");
    } else {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--jood-ground)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "340px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/jood-logo-dark.png" alt="JOOD" style={{ height: "28px", width: "auto" }} />
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--jood-ink-muted)",
              marginTop: "10px",
            }}
          >
            Admin access
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
            style={{
              width: "100%",
              padding: "14px 16px",
              fontSize: "0.9375rem",
              backgroundColor: "var(--jood-surface)",
              border: `1px solid ${error ? "var(--jood-danger)" : "var(--jood-line)"}`,
              borderRadius: "var(--radius-md)",
              color: "var(--jood-ink)",
              outline: "none",
              marginBottom: error ? "8px" : "16px",
              boxSizing: "border-box",
            }}
          />
          {error && (
            <p
              style={{
                color: "var(--jood-danger)",
                fontSize: "0.8125rem",
                marginBottom: "16px",
              }}
            >
              Incorrect password
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: loading ? "var(--jood-ink-muted)" : "var(--jood-ink)",
              color: "var(--jood-ground)",
              border: "none",
              borderRadius: "var(--radius-pill)",
              fontSize: "0.9375rem",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background-color 150ms ease",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
