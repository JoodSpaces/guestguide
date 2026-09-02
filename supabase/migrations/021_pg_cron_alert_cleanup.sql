-- ─── pg_cron: auto-resolve stale recurring_damage alerts ────────────────────
-- Requires the pg_cron extension, which is enabled by default on Supabase.
-- This job runs daily at 03:00 UTC and calls the function defined in 006.

select cron.schedule(
  'auto-resolve-stale-alerts',  -- job name (idempotent)
  '0 3 * * *',                  -- every day at 03:00 UTC
  $$ select auto_resolve_stale_alerts(); $$
);
