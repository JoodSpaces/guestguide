-- Enable Row-Level Security on all tables that were created without it
-- (migrations 002–007). No permissive policies are added — deny-by-default
-- protects against direct anon/authenticated PostgREST access.
--
-- All JOOD API routes use createServiceClient() (service role), which bypasses
-- RLS entirely. Guest-facing data is accessed exclusively through token-gated
-- Next.js route handlers, never directly from the browser anon client.

-- ── Migration 002: ops module ─────────────────────────────────────────────────
ALTER TABLE turnover_tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnover_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnover_damage_items   ENABLE ROW LEVEL SECURITY;

-- ── Migration 003/008: maintenance ───────────────────────────────────────────
ALTER TABLE maintenance_tickets     ENABLE ROW LEVEL SECURITY;

-- ── Migration 004: guest + service requests ───────────────────────────────────
ALTER TABLE guest_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests        ENABLE ROW LEVEL SECURITY;

-- ── Migration 005: team members ──────────────────────────────────────────────
ALTER TABLE team_members            ENABLE ROW LEVEL SECURITY;

-- ── Migration 006: inventory intelligence ────────────────────────────────────
ALTER TABLE inventory_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_inventory      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts        ENABLE ROW LEVEL SECURITY;

-- ── Migration 007: admin presence ────────────────────────────────────────────
ALTER TABLE admin_presence          ENABLE ROW LEVEL SECURITY;
