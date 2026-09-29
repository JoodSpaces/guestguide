-- ============================================================
-- Migration 027: close the anonymous door on the whole schema
-- ============================================================
--
-- WHY
-- Every request in this app goes through the service-role client inside a
-- token- or session-gated route handler. Nothing needs the public (anon) key to
-- read or write data — the only browser use of it is a Realtime subscription
-- that RLS already starves of events.
--
-- But the anon key ships in the browser bundle, and migrations 001 / 023 left
-- "select using (true)" policies for anon on `properties`, `media`,
-- `recommendations` (and published rows of `property_content`, `services`).
-- RLS is row-level only, so anyone with the key could
--     GET /rest/v1/properties?select=*
-- and read EVERY column of EVERY property: the street address, the on-call
-- phone, the encrypted wifi password, coordinates, the "tonight" note, and the
-- house manual (which may describe how to get in). Guests only get that after
-- they book; a stranger must not.
--
-- WHAT THIS DOES (idempotent — safe to re-run)
--   1. Drops every anon/authenticated read policy on those tables, so RLS is
--      deny-by-default again.
--   2. Revokes all table privileges from anon (defence in depth: even if a
--      permissive policy is added later by mistake, there is no grant to use).
--   3. Makes future tables default to no anon access.
--   4. Revokes EXECUTE on public functions from anon/authenticated
--      (record_token_open is SECURITY DEFINER and was callable via /rpc).
--
-- BEFORE YOU RUN IT (this file has NOT been applied to any database)
--   * Test on a staging copy or in a transaction you roll back first.
--   * If you later want a public property listing, expose a dedicated VIEW with
--     only the columns you choose and grant SELECT on that view — never the
--     base table.
--   * After running, re-probe as anon: GET /rest/v1/properties must return
--     401/403 (or []), and the guest site / admin must still work (they use the
--     service role and are unaffected).
-- ============================================================

-- 1. Policies -------------------------------------------------------------
drop policy if exists "anon_read_properties"          on properties;
drop policy if exists "anon_read_properties_public"   on properties;
drop policy if exists "anon_read_media"               on media;
drop policy if exists "anon_read_recommendations"     on recommendations;
drop policy if exists "anon_read_property_content"    on property_content;
drop policy if exists "anon_read_services"            on services;
drop policy if exists "anon_read_services_public"     on services;

-- 2. Table privileges -----------------------------------------------------
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

-- `authenticated` is never used by this app (staff sign in through the app's own
-- session, not Supabase Auth), so it gets the same treatment.
revoke all on all tables    in schema public from authenticated;
revoke all on all sequences in schema public from authenticated;

-- 3. Future objects -------------------------------------------------------
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- 4. Functions ------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
grant  execute on all functions in schema public to service_role;
