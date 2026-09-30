-- ─── 032_voice_sessions.sql ──────────────────────────────────────────────────
-- One row per voice-concierge conversation: who, how long, the transcript, and the questions the agent could not answer.
-- Drives the monthly-minutes cap and the admin "Voice" page. Service role only (no grants to anon/authenticated). Idempotent.
CREATE TABLE IF NOT EXISTS voice_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at     TIMESTAMPTZ,
  duration_sec INT NOT NULL DEFAULT 0,
  locale       TEXT NOT NULL DEFAULT 'en',
  transcript   JSONB NOT NULL DEFAULT '[]'::jsonb,
  unanswered   TEXT[] NOT NULL DEFAULT '{}',
  actions      TEXT[] NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_started ON voice_sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_booking ON voice_sessions (booking_id);
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON voice_sessions FROM anon, authenticated;
