-- ─── 033_voice_limit.sql ─────────────────────────────────────────────────────
-- Optional cap on voice-concierge conversations for one stay (NULL = no per-stay cap, only the daily and monthly ones).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS voice_limit INT CHECK (voice_limit IS NULL OR voice_limit >= 0);
