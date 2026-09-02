"use client";

import Link from "next/link";
import { useState } from "react";

type Status = "confirmed" | "cancelled" | "completed";

export interface BookingData {
  id: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  guestLang: string;
  guestCount: number;
  checkIn: string;
  checkOut: string;
  status: Status;
  source: string;
  externalRef: string | null;
  doorCode: string | null;
  createdAt: string;
  propertyId: string;
}

interface TokenRow {
  id: string;
  open_count: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  revoked_at: string | null;
  expires_at: string;
}

interface RatingRow {
  stars: number;
  comment: string | null;
  created_at: string;
}

interface Props {
  booking: BookingData;
  property: { id: string; name: string; name_ar: string } | null;
  tokens: TokenRow[];
  rating: RatingRow | null;
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

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.14em",
  fontSize: "0.7rem",
  color: "var(--jood-ink-muted)",
  marginBottom: "14px",
};

const card: React.CSSProperties = {
  backgroundColor: "var(--jood-surface)",
  border: "1px solid var(--jood-line)",
  borderRadius: "var(--radius-lg)",
  padding: "20px 24px",
  marginBottom: "16px",
};

const STATUS_COLOR: Record<string, string> = {
  confirmed: "var(--jood-accent)",
  cancelled: "var(--jood-danger)",
  completed: "var(--jood-ink-muted)",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BookingDetailClient({ booking, property, tokens, rating }: Props) {
  const [doorCode, setDoorCode] = useState(booking.doorCode ?? "");
  const [editingCode, setEditingCode] = useState(false);
  const [savingCode, setSavingCode] = useState(false);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);

  const [status, setStatus] = useState<Status>(booking.status);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [generatingLink, setGeneratingLink] = useState(false);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function saveDoorCode() {
    setSavingCode(true);
    setCodeMsg(null);
    const res = await fetch(`/api/admin/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doorCode: doorCode || null }),
    });
    setSavingCode(false);
    if (res.ok) {
      setEditingCode(false);
      setCodeMsg("Saved");
    } else {
      setCodeMsg("Save failed");
    }
  }

  async function saveStatus(newStatus: Status) {
    setSavingStatus(true);
    setStatusMsg(null);
    const res = await fetch(`/api/admin/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setSavingStatus(false);
    if (res.ok) {
      setStatus(newStatus);
      setStatusMsg("Updated");
    } else {
      setStatusMsg("Update failed");
    }
  }

  async function generateLink() {
    setGeneratingLink(true);
    const res = await fetch(`/api/admin/bookings/${booking.id}/token`, { method: "POST" });
    setGeneratingLink(false);
    if (res.ok) {
      const data = await res.json();
      setNewLink(data.link);
      setQrDataUrl(data.qrDataUrl ?? null);
    }
  }

  const activeToken = tokens.find((t) => !t.revoked_at);

  return (
    <div>
      {/* Back */}
      <Link
        href="/admin/bookings"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          color: "var(--jood-ink-muted)",
          textDecoration: "none",
          fontSize: "0.8125rem",
          marginBottom: "24px",
        }}
      >
        ← Bookings
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <h1 className="font-display" style={{ fontSize: "1.8rem", lineHeight: 1.1 }}>
            {booking.guestFirstName} {booking.guestLastName}
          </h1>
          <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.875rem", marginTop: "4px" }}>
            {property?.name} · {fmt(booking.checkIn)} → {fmt(booking.checkOut)}
          </p>
        </div>
        <span
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "9px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: STATUS_COLOR[status] ?? "var(--jood-ink-muted)",
            border: `1px solid ${STATUS_COLOR[status] ?? "var(--jood-line)"}`,
            borderRadius: "20px",
            padding: "4px 10px",
          }}
        >
          {status}
        </span>
      </div>

      {/* Guest info */}
      <div style={card}>
        <p style={eyebrow}>Guest</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          <InfoRow label="Email" value={booking.guestEmail ?? "—"} />
          <InfoRow label="Phone" value={booking.guestPhone ?? "—"} />
          <InfoRow label="Language" value={booking.guestLang === "ar" ? "Arabic" : "English"} />
          <InfoRow label="Guests" value={String(booking.guestCount)} />
          <InfoRow label="Source" value={booking.source} />
          {booking.externalRef && <InfoRow label="Ref" value={booking.externalRef} />}
        </div>
      </div>

      {/* Guest rating */}
      {rating && (
        <div style={card}>
          <p style={eyebrow}>Guest rating</p>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: rating.comment ? "12px" : 0 }}>
            <div style={{ display: "flex", gap: "3px" }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} style={{ fontSize: "1.25rem", filter: s <= rating.stars ? "none" : "grayscale(1) opacity(0.25)" }}>★</span>
              ))}
            </div>
            <span style={{ fontSize: "0.875rem", color: "var(--jood-ink-muted)" }}>
              {rating.stars}/5 · {new Date(rating.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          {rating.comment && (
            <p style={{ fontSize: "0.9375rem", color: "var(--jood-ink)", lineHeight: 1.6, borderTop: "1px solid var(--jood-line)", paddingTop: "12px", fontStyle: "italic" }}>
              &ldquo;{rating.comment}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Door code */}
      <div style={card}>
        <p style={eyebrow}>Door code</p>
        {editingCode ? (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              value={doorCode}
              onChange={(e) => setDoorCode(e.target.value)}
              placeholder="e.g. 47-3812"
              style={{ ...field, width: "200px", fontFamily: "var(--font-mono)", letterSpacing: "0.15em" }}
              autoFocus
            />
            <button
              onClick={saveDoorCode}
              disabled={savingCode}
              style={{
                padding: "10px 20px",
                backgroundColor: "var(--jood-ink)",
                color: "var(--jood-ground)",
                border: "none",
                borderRadius: "var(--radius-pill)",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              {savingCode ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => { setEditingCode(false); setDoorCode(booking.doorCode ?? ""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--jood-ink-muted)", fontSize: "0.875rem" }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.5rem", letterSpacing: "0.15em", color: "var(--jood-ink)" }}>
              {doorCode || "—"}
            </span>
            <button
              onClick={() => { setEditingCode(true); setCodeMsg(null); }}
              style={{
                padding: "6px 14px",
                border: "1px solid var(--jood-line)",
                borderRadius: "var(--radius-pill)",
                background: "none",
                cursor: "pointer",
                fontSize: "0.8125rem",
                color: "var(--jood-ink-muted)",
              }}
            >
              Edit
            </button>
            {codeMsg && (
              <span style={{ fontSize: "0.8125rem", color: codeMsg === "Saved" ? "var(--jood-success)" : "var(--jood-danger)" }}>
                {codeMsg}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Status */}
      <div style={card}>
        <p style={eyebrow}>Status</p>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {(["confirmed", "completed", "cancelled"] as Status[]).map((s) => (
            <button
              key={s}
              onClick={() => status !== s && saveStatus(s)}
              disabled={savingStatus}
              style={{
                padding: "8px 18px",
                borderRadius: "var(--radius-pill)",
                border: `1px solid ${status === s ? (STATUS_COLOR[s] ?? "var(--jood-line)") : "var(--jood-line)"}`,
                backgroundColor: status === s ? "var(--jood-surface-raised)" : "transparent",
                color: status === s ? (STATUS_COLOR[s] ?? "var(--jood-ink)") : "var(--jood-ink-muted)",
                cursor: status === s ? "default" : "pointer",
                fontSize: "0.8125rem",
                fontFamily: "var(--font-label)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              {s}
            </button>
          ))}
          {statusMsg && (
            <span style={{ fontSize: "0.8125rem", color: statusMsg === "Updated" ? "var(--jood-success)" : "var(--jood-danger)" }}>
              {statusMsg}
            </span>
          )}
        </div>
      </div>

      {/* Guest link */}
      <div style={card}>
        <p style={eyebrow}>Guest link</p>
        {activeToken ? (
          <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginBottom: "14px" }}>
            {activeToken.open_count} open{activeToken.open_count !== 1 ? "s" : ""}
            {activeToken.last_opened_at ? ` · last ${fmt(activeToken.last_opened_at)}` : ""}
            {" · "}expires {fmt(activeToken.expires_at)}
          </p>
        ) : (
          <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)", marginBottom: "14px" }}>No active token</p>
        )}

        {newLink ? (
          <div style={{ backgroundColor: "var(--jood-ground)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)", padding: "20px", marginBottom: "12px", display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* QR code */}
            {qrDataUrl && (
              <div style={{ flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="Guest link QR code"
                  width={120}
                  height={120}
                  style={{ display: "block", borderRadius: "8px", border: "1px solid var(--jood-line)" }}
                />
                <p style={{ fontSize: "0.7rem", color: "var(--jood-ink-ghost)", fontFamily: "var(--font-label)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "6px", textAlign: "center" }}>
                  Scan to open
                </p>
              </div>
            )}
            {/* Link + actions */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", wordBreak: "break-all", color: "var(--jood-ink-muted)", marginBottom: "14px", lineHeight: 1.6 }}>
                {newLink}
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(newLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  style={{ padding: "9px 18px", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-pill)", background: copied ? "var(--jood-surface-raised)" : "none", cursor: "pointer", fontSize: "0.8125rem", color: copied ? "var(--jood-success)" : "var(--jood-ink)", transition: "all 200ms" }}
                >
                  {copied ? "Copied ✓" : "Copy link"}
                </button>
                <a
                  href={newLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ padding: "9px 18px", backgroundColor: "var(--jood-ink)", color: "var(--jood-ground)", borderRadius: "var(--radius-pill)", textDecoration: "none", fontSize: "0.8125rem" }}
                >
                  Preview as guest →
                </a>
              </div>
            </div>
          </div>
        ) : null}

        <button
          onClick={generateLink}
          disabled={generatingLink}
          style={{
            padding: "10px 20px",
            border: "1px solid var(--jood-line)",
            borderRadius: "var(--radius-pill)",
            background: "none",
            cursor: generatingLink ? "wait" : "pointer",
            fontSize: "0.875rem",
            color: "var(--jood-ink)",
          }}
        >
          {generatingLink ? "Generating…" : newLink ? "Generate another" : "Generate guest link"}
        </button>
      </div>

      {/* Unit guide */}
      {property && (
        <div style={card}>
          <p style={eyebrow}>Unit guide</p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <a
              href={`/admin/properties/${property.id}/guide`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                backgroundColor: "var(--jood-ink)",
                color: "var(--jood-ground)",
                borderRadius: "var(--radius-pill)",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              View guide →
            </a>
            <a
              href={`/admin/properties/${property.id}/guide/edit`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                backgroundColor: "transparent",
                color: "var(--jood-ink)",
                border: "1px solid var(--jood-line)",
                borderRadius: "var(--radius-pill)",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              Edit guide
            </a>
          </div>
        </div>
      )}

      {/* Meta */}
      <p style={{ fontSize: "0.75rem", color: "var(--jood-ink-ghost)", marginTop: "8px" }}>
        Booking {booking.id} · Created {fmt(booking.createdAt)}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontFamily: "var(--font-label)", fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "3px" }}>
        {label}
      </p>
      <p style={{ fontSize: "0.9rem", color: "var(--jood-ink)" }}>{value}</p>
    </div>
  );
}
