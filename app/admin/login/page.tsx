"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  fontSize: "0.9375rem",
  backgroundColor: "var(--jood-surface)",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-md)",
  color: "var(--jood-ink)",
  outline: "none",
  marginBottom: "12px",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
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
      body: JSON.stringify({ name, password }),
    });

    if (res.ok) {
      const data = await res.json();
      router.replace(data.redirect ?? "/admin");
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
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/jood-logo-dark.png" alt="JOOD" style={{ height: "28px", width: "auto" }} />
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginTop: "10px" }}>
            Team access
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="username"
            autoFocus
            required
            style={{ ...inputStyle, borderColor: error ? "var(--jood-danger)" : "var(--jood-line)" }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{ ...inputStyle, borderColor: error ? "var(--jood-danger)" : "var(--jood-line)", marginBottom: error ? "8px" : "16px" }}
          />
          {error && (
            <p style={{ color: "var(--jood-danger)", fontSize: "0.8125rem", marginBottom: "16px" }}>
              Name or password is incorrect
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !name || !password}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: loading ? "var(--jood-ink-muted)" : "var(--jood-ink)",
              color: "var(--jood-ground)",
              border: "none",
              borderRadius: "var(--radius-pill)",
              fontSize: "0.9375rem",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
