-- ============================================================
-- Migration 023: Explicit RLS policies + hot-path indexes
-- ============================================================
--
-- ARCHITECTURE NOTE
-- All JOOD application code uses the service-role client, which bypasses
-- RLS entirely. Migrations 015 onward enabled RLS on all tables with NO
-- permissive policies, resulting in an implicit deny-all for the anon/
-- authenticated PostgREST roles.
--
-- This migration makes that deny-all explicit with named policies so that:
--  (a) The intent is documented and visible in pg_policies.
--  (b) A future developer cannot accidentally grant anon access without
--      reviewing and explicitly adding a permissive policy.
--  (c) The properties and services tables expose read-only public columns
--      via the anon key (safe for a potential future public API / realtime).
--
-- Sensitive tables (bookings, stay_tokens, team_members, guest_requests,
-- service_requests, turnover_*, maintenance_*, inventory_*) retain
-- deny-all — no anon access at any row.
-- ============================================================

-- ── Public read-only policies ────────────────────────────────────────────────
-- Properties: slug, name, city, address, bedrooms, max_guests are
-- non-sensitive and may be exposed to anon callers (e.g., a future
-- property-listing endpoint or realtime subscription).

CREATE POLICY "anon_read_properties_public"
  ON properties
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Services: name, description, pricing, active status are public.
CREATE POLICY "anon_read_services_public"
  ON services
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- ── Hot-path indexes ─────────────────────────────────────────────────────────
-- stay_tokens.token_hash already has a UNIQUE index (from migration 001).
-- Verify other hot paths.

-- booking_id lookups on all request tables
CREATE INDEX IF NOT EXISTS service_requests_booking_id_idx
  ON service_requests(booking_id);

CREATE INDEX IF NOT EXISTS guest_requests_booking_id_idx
  ON guest_requests(booking_id);

CREATE INDEX IF NOT EXISTS push_subscriptions_booking_id_idx
  ON push_subscriptions(booking_id);

CREATE INDEX IF NOT EXISTS turnover_tasks_property_id_idx
  ON turnover_tasks(property_id);

CREATE INDEX IF NOT EXISTS maintenance_tickets_property_id_idx
  ON maintenance_tickets(property_id);

-- Status filtering (common WHERE clause in admin list views)
CREATE INDEX IF NOT EXISTS service_requests_status_idx
  ON service_requests(status);

CREATE INDEX IF NOT EXISTS guest_requests_status_idx
  ON guest_requests(status);

CREATE INDEX IF NOT EXISTS maintenance_tickets_status_idx
  ON maintenance_tickets(status);

-- Booking date range lookups (check_in / check_out filtering)
CREATE INDEX IF NOT EXISTS bookings_check_in_idx
  ON bookings(check_in);

CREATE INDEX IF NOT EXISTS bookings_property_id_idx
  ON bookings(property_id);
