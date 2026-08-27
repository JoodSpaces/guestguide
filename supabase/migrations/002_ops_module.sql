-- ─── Ops Module ───────────────────────────────────────────────────────────────

-- Turnover tasks (one per checkout)
CREATE TABLE IF NOT EXISTS turnover_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid REFERENCES bookings(id) ON DELETE SET NULL,
  property_id     uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','ready','approved')),
  assigned_to     text,
  notes           text,
  condition       text CHECK (condition IN ('excellent','good','fair','damaged')),
  damage_notes    text,
  started_at      timestamptz,
  completed_at    timestamptz,
  approved_at     timestamptz,
  approved_by     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Checklist items per turnover task
CREATE TABLE IF NOT EXISTS turnover_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid REFERENCES turnover_tasks(id) ON DELETE CASCADE NOT NULL,
  room        text NOT NULL,
  label       text NOT NULL,
  checked     boolean NOT NULL DEFAULT false,
  checked_at  timestamptz,
  photo_url   text,
  notes       text,
  sort_order  int NOT NULL DEFAULT 0
);

-- Maintenance tickets
CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  booking_id        uuid REFERENCES bookings(id) ON DELETE SET NULL,
  title             text NOT NULL,
  description       text,
  category          text NOT NULL DEFAULT 'general'
                      CHECK (category IN ('plumbing','electrical','ac','appliance','furniture','pool','structural','general')),
  priority          text NOT NULL DEFAULT 'normal'
                      CHECK (priority IN ('urgent','normal','low')),
  status            text NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','in_progress','resolved')),
  assigned_to       text,
  photo_urls        text[] NOT NULL DEFAULT '{}',
  resolution_notes  text,
  resolved_at       timestamptz,
  resolved_by       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Inventory items (per property)
CREATE TABLE IF NOT EXISTS inventory_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  category        text NOT NULL DEFAULT 'general'
                    CHECK (category IN ('linen','consumables','kitchen','amenities','general')),
  name            text NOT NULL,
  unit            text NOT NULL DEFAULT 'pcs',
  par_level       int NOT NULL DEFAULT 0,
  current_stock   int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Inventory usage logs (per turnover)
CREATE TABLE IF NOT EXISTS inventory_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             uuid REFERENCES turnover_tasks(id) ON DELETE CASCADE,
  item_id             uuid REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
  quantity_used       int NOT NULL DEFAULT 0,
  quantity_restocked  int NOT NULL DEFAULT 0,
  logged_at           timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS turnover_tasks_property_id ON turnover_tasks(property_id);
CREATE INDEX IF NOT EXISTS turnover_tasks_status ON turnover_tasks(status);
CREATE INDEX IF NOT EXISTS turnover_tasks_created_at ON turnover_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS turnover_items_task_id ON turnover_items(task_id);
CREATE INDEX IF NOT EXISTS maintenance_tickets_property_id ON maintenance_tickets(property_id);
CREATE INDEX IF NOT EXISTS maintenance_tickets_status ON maintenance_tickets(status);
CREATE INDEX IF NOT EXISTS inventory_items_property_id ON inventory_items(property_id);
