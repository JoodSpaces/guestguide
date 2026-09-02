-- ─── 022_fix_inventory_items_columns.sql ──────────────────────────────────────
-- Migration 002 created inventory_items as a per-property table (with property_id,
-- par_level, current_stock). Migration 006 attempted to replace it with a global
-- catalog schema that added reorder_threshold_default, name_ar, and icon — but
-- the CREATE TABLE IF NOT EXISTS was a no-op since the table already existed.
--
-- The trigger functions installed in 006 (handle_turnover_damage, check_low_stock,
-- handle_inventory_restock) reference ii.reorder_threshold_default at runtime.
-- Without this column, every damage-item INSERT would raise a PostgreSQL error
-- and leave inventory counts permanently wrong.
--
-- This migration adds the missing columns to the existing table without removing
-- or altering any existing columns (non-destructive, safe to apply to a live DB).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS reorder_threshold_default INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS name_ar                   TEXT,
  ADD COLUMN IF NOT EXISTS icon                      TEXT;
