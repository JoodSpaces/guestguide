"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <div style={{
      minHeight: "100dvh",
      backgroundColor: "var(--jood-ground)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      /* Subtle noise from body is inherited */
    }}>
      {/* Editorial frame */}
      <div style={{
        position: "fixed",
        inset: "12px",
        border: "1px solid var(--jood-line)",
        borderRadius: "var(--radius-lg)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      <div style={{ width: "100%", maxWidth: "320px", position: "relative", zIndex: 1 }}>

        {/* Brand mark */}
        <div style={{ marginBottom: "52px" }}>
          <img
            src="/jood-logo-dark.png"
            alt="JOOD"
            className="jood-logo"
            style={{ height: "24px", width: "auto", display: "block" }}
          />
          <div style={{
            marginTop: "8px",
            height: "1px",
            width: "32px",
            backgroundColor: "var(--jood-garnet)",
            opacity: 0.6,
          }} />
          <p style={{
            fontFamily: "var(--font-label)",
            fontSize: "8.5px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--jood-ink-muted)",
            marginTop: "12px",
          }}>
            Team Access
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="jood-field">
            <label className="jood-label" htmlFor="admin-name">Name</label>
            <input
              id="admin-name"
              type="text"
              placeholder=""
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="username"
              autoFocus
              required
              className={`jood-input${error ? " is-error" : ""}`}
            />
          </div>

          <div className="jood-field" style={{ marginBottom: "28px" }}>
            <label className="jood-label" htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              placeholder=""
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className={`jood-input${error ? " is-error" : ""}`}
            />
          </div>

          {/* Error message */}
          {error && (
            <p style={{
              fontSize: "0.8125rem",
              color: "var(--jood-danger)",
              marginBottom: "16px",
              lineHeight: 1.5,
            }}>
              Incorrect name or password.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-full"
            style={{ fontSize: "0.875rem" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          marginTop: "48px",
          fontSize: "0.6875rem",
          color: "var(--jood-ink-ghost)",
          lineHeight: 1.7,
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.02em",
        }}>
          This area is restricted to JOOD staff.
          <br />If you are a guest, please use your stay link.
        </p>
      </div>
    </div>
  );
}
