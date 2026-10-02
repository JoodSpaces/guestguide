-- ─── 035_cleaning_photo_review.sql ───────────────────────────────────────────
-- Cleaning photos become staff-only (private bucket, short-lived signed links) and get an AI "second pair of eyes" review.
-- The review only FLAGS what is visible; a person decides. Result is stored on the turnover task.
ALTER TABLE turnover_tasks ADD COLUMN IF NOT EXISTS photo_review JSONB;
ALTER TABLE turnover_tasks ADD COLUMN IF NOT EXISTS photo_reviewed_at TIMESTAMPTZ;

INSERT INTO storage.buckets (id, name, public) VALUES ('ops-photos-private', 'ops-photos-private', false)
ON CONFLICT (id) DO NOTHING;
