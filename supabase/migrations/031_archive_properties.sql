-- ─── 031_archive_properties.sql ──────────────────────────────────────────────
-- "Delete property" used to delete the property AND every booking, request, turnover and stock record behind it
-- (ON DELETE CASCADE), after one browser confirm. Properties are now archived instead: hidden from every list and
-- closed to new bookings, with all history kept, and they can be restored. Idempotent.
ALTER TABLE properties ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_properties_active ON properties (name) WHERE archived_at IS NULL;
