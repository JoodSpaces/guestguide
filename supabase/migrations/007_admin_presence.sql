-- ─── 007_admin_presence.sql ──────────────────────────────────────────────────
-- Lightweight presence tracking for admin team members.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_presence (
  name         TEXT        PRIMARY KEY,
  role         TEXT        NOT NULL DEFAULT 'admin',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
