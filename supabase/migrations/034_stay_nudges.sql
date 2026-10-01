-- ─── 034_stay_nudges.sql ─────────────────────────────────────────────────────
-- Proactive nudges (evening before check-out, mid-stay): where a push should open, and a record so each one is sent once.
-- Service role only. Idempotent.
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS stay_path TEXT;

CREATE TABLE IF NOT EXISTS stay_nudges (
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (booking_id, kind)
);
ALTER TABLE stay_nudges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON stay_nudges FROM anon, authenticated;
