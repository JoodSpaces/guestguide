"use client";

import { useState } from "react";

interface Property {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  properties: Property[];
}

const field: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--jood-ground)",
  color: "var(--jood-ink)",
  fontSize: "0.9375rem",
  boxSizing: "border-box",
};

const label: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-label)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: "0.7rem",
  color: "var(--jood-ink-muted)",
  marginBottom: "6px",
};

export function NewBookingForm({ properties }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ link: string; bookingId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      propertyId: fd.get("propertyId"),
      guestFirstName: fd.get("guestFirstName"),
      guestLastName: fd.get("guestLastName"),
      guestEmail: fd.get("guestEmail") || null,
      guestPhone: fd.get("guestPhone") || null,
      guestLang: fd.get("guestLang"),
      guestCount: Number(fd.get("guestCount")),
      checkIn: fd.get("checkIn"),
      checkOut: fd.get("checkOut"),
      doorCode: fd.get("doorCode") || null,
      source: fd.get("source"),
      externalRef: fd.get("externalRef") || null,
    };

    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Unknown error");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div>
        <div
          style={{
            backgroundColor: "var(--jood-surface)",
            border: "1px solid var(--jood-line)",
            borderRadius: "var(--radius-lg)",
            padding: "24px",
            marginBottom: "16px",
          }}
        >
          <p className="label-eyebrow" style={{ color: "var(--jood-ink-muted)", marginBottom: "10px" }}>
            Guest link
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.875rem",
              color: "var(--jood-ink)",
              wordBreak: "break-all",
              marginBottom: "16px",
            }}
          >
            {result.link}
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => navigator.clipboard.writeText(result.link)}
              style={{
                padding: "10px 20px",
                border: "1px solid var(--jood-line)",
                borderRadius: "var(--radius-pill)",
                background: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                color: "var(--jood-ink)",
              }}
            >
              Copy link
            </button>
            <a
              href={result.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "10px 20px",
                backgroundColor: "var(--jood-ink)",
                color: "var(--jood-ground)",
                borderRadius: "var(--radius-pill)",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              Open as guest
            </a>
          </div>
        </div>
        <button
          onClick={() => setResult(null)}
          style={{ color: "var(--jood-ink-muted)", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem" }}
        >
          Create another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Property */}
      <div>
        <label style={label}>Property</label>
        <select name="propertyId" required style={field}>
          <option value="">Select property…</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Guest name */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <label style={label}>First name</label>
          <input name="guestFirstName" required style={field} />
        </div>
        <div>
          <label style={label}>Last name</label>
          <input name="guestLastName" required style={field} />
        </div>
      </div>

      {/* Contact */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <label style={label}>Email</label>
          <input name="guestEmail" type="email" style={field} />
        </div>
        <div>
          <label style={label}>Phone</label>
          <input name="guestPhone" type="tel" style={field} placeholder="+201234567890" />
        </div>
      </div>

      {/* Language & count */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <label style={label}>Guest language</label>
          <select name="guestLang" style={field} defaultValue="en">
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </select>
        </div>
        <div>
          <label style={label}>Guest count</label>
          <input name="guestCount" type="number" min="1" defaultValue="2" required style={field} />
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <label style={label}>Check-in</label>
          <input name="checkIn" type="datetime-local" required style={field} />
        </div>
        <div>
          <label style={label}>Check-out</label>
          <input name="checkOut" type="datetime-local" required style={field} />
        </div>
      </div>

      {/* Door code */}
      <div>
        <label style={label}>Door code (optional — can set later)</label>
        <input
          name="doorCode"
          style={{ ...field, fontFamily: "var(--font-mono)", letterSpacing: "0.15em" }}
          placeholder="e.g. 47-3812"
        />
      </div>

      {/* Source */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <label style={label}>Source</label>
          <select name="source" style={field} defaultValue="direct">
            <option value="direct">Direct</option>
            <option value="airbnb">Airbnb</option>
            <option value="booking">Booking.com</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label style={label}>External ref (optional)</label>
          <input name="externalRef" style={field} placeholder="Airbnb confirmation #" />
        </div>
      </div>

      {error && (
        <p style={{ color: "var(--jood-danger)", fontSize: "0.875rem" }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "14px",
          backgroundColor: loading ? "var(--jood-line)" : "var(--jood-ink)",
          color: loading ? "var(--jood-ink-muted)" : "var(--jood-ground)",
          border: "none",
          borderRadius: "var(--radius-pill)",
          fontSize: "0.9375rem",
          cursor: loading ? "wait" : "pointer",
          transition: "background-color 200ms var(--ease-standard)",
        }}
      >
        {loading ? "Creating booking…" : "Create booking & generate link"}
      </button>
    </form>
  );
}
