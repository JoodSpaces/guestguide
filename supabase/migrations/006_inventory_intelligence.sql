-- ─── 006_inventory_intelligence.sql ──────────────────────────────────────────
-- Idempotent — safe to re-run if a previous attempt partially succeeded.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Core: master item catalog ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_items (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT        NOT NULL,
  name_ar                   TEXT,
  category                  TEXT        NOT NULL DEFAULT 'general'
    CHECK (category IN ('linens','toiletries','appliances','furniture','consumables','equipment','general')),
  unit                      TEXT        NOT NULL DEFAULT 'each'
    CHECK (unit IN ('each','set','pair','pack','kg','l')),
  icon                      TEXT,
  reorder_threshold_default INTEGER     NOT NULL DEFAULT 5,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Core: per-property stock levels ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS property_inventory (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  item_id           UUID        NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity          INTEGER     NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  damaged_quantity  INTEGER     NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
  reorder_threshold INTEGER,
  avg_daily_usage   NUMERIC(10,2) NOT NULL DEFAULT 0,
  last_restocked_at TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, item_id)
);

-- ─── Core: immutable audit log ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  item_id       UUID        NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  delta         INTEGER     NOT NULL,
  delta_damaged INTEGER     NOT NULL DEFAULT 0,
  reason        TEXT        NOT NULL
    CHECK (reason IN (
      'turnover_damage','service_fulfillment',
      'manual_restock','manual_adjustment',
      'maintenance_flagged','maintenance_resolved'
    )),
  source_type   TEXT        CHECK (source_type IN ('turnover_task','service_request','maintenance_ticket')),
  source_id     UUID,
  notes         TEXT,
  created_by    TEXT        NOT NULL DEFAULT 'system',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Bridge: damage flags on a turnover task ─────────────────────────────────

CREATE TABLE IF NOT EXISTS turnover_damage_items (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  turnover_task_id UUID        NOT NULL REFERENCES turnover_tasks(id) ON DELETE CASCADE,
  item_id          UUID        NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity         INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  condition        TEXT        NOT NULL DEFAULT 'damaged'
    CHECK (condition IN ('damaged','missing','needs_cleaning')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Bridge: supply manifest per service ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_supplies (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id        UUID    NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  item_id           UUID    NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_per_unit INTEGER NOT NULL DEFAULT 1 CHECK (quantity_per_unit > 0),
  UNIQUE (service_id, item_id)
);

-- ─── Bridge: items flagged in a maintenance ticket ───────────────────────────

CREATE TABLE IF NOT EXISTS maintenance_ticket_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID        NOT NULL REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
  item_id     UUID        NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity    INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  item_status TEXT        NOT NULL DEFAULT 'out_of_service'
    CHECK (item_status IN ('out_of_service','needs_replacement')),
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Alert: auto-generated, severity-aware ───────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_alerts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  item_id     UUID        NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  alert_type  TEXT        NOT NULL
    CHECK (alert_type IN ('low_stock','recurring_damage','out_of_service')),
  severity    TEXT        NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','critical')),
  message     TEXT,
  source_type TEXT,
  source_id   UUID,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Upgrade existing tables if migration was partially run ──────────────────

ALTER TABLE property_inventory  ADD COLUMN IF NOT EXISTS avg_daily_usage   NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE property_inventory  ADD COLUMN IF NOT EXISTS last_restocked_at TIMESTAMPTZ;
ALTER TABLE inventory_alerts    ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE inventory_alerts    ADD COLUMN IF NOT EXISTS message  TEXT;

-- Constrain severity if the check was not applied at creation time
DO $$ BEGIN
  ALTER TABLE inventory_alerts ADD CONSTRAINT inventory_alerts_severity_check
    CHECK (severity IN ('low','medium','critical'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_property_inventory_lookup  ON property_inventory(property_id, item_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_property_time       ON inventory_transactions(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_tx_source              ON inventory_transactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_damage_check        ON inventory_transactions(property_id, item_id, created_at)
  WHERE reason = 'turnover_damage';
CREATE INDEX IF NOT EXISTS idx_turnover_damage_task       ON turnover_damage_items(turnover_task_id);
CREATE INDEX IF NOT EXISTS idx_maint_ticket_items_ticket  ON maintenance_ticket_items(ticket_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_open      ON inventory_alerts(property_id, item_id)
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_severity  ON inventory_alerts(severity, created_at DESC)
  WHERE resolved_at IS NULL;

-- ─── Intelligence: usage rate ─────────────────────────────────────────────────
-- Recalculates avg_daily_usage from the last 90 days of negative deltas.

CREATE OR REPLACE FUNCTION update_usage_rate(p_property_id UUID, p_item_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_total_used INTEGER;
  v_days       NUMERIC;
BEGIN
  SELECT
    ABS(COALESCE(SUM(CASE WHEN delta < 0 THEN delta ELSE 0 END), 0)),
    GREATEST(1, EXTRACT(EPOCH FROM (now() - MIN(created_at))) / 86400.0)
  INTO v_total_used, v_days
  FROM inventory_transactions
  WHERE property_id = p_property_id
    AND item_id     = p_item_id
    AND created_at  > now() - INTERVAL '90 days'
    AND delta < 0;

  UPDATE property_inventory
  SET avg_daily_usage = ROUND(v_total_used::NUMERIC / v_days, 2)
  WHERE property_id = p_property_id AND item_id = p_item_id;
END;
$$;

-- ─── Intelligence: low-stock check (severity-aware, auto-resolves) ────────────

CREATE OR REPLACE FUNCTION check_low_stock(p_property_id UUID, p_item_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_qty       INTEGER;
  v_threshold INTEGER;
  v_name      TEXT;
  v_severity  TEXT;
  v_message   TEXT;
BEGIN
  SELECT pi.quantity,
         COALESCE(pi.reorder_threshold, ii.reorder_threshold_default),
         ii.name
  INTO   v_qty, v_threshold, v_name
  FROM   property_inventory pi
  JOIN   inventory_items ii ON ii.id = pi.item_id
  WHERE  pi.property_id = p_property_id AND pi.item_id = p_item_id;

  IF v_qty IS NOT NULL AND v_qty <= v_threshold THEN
    -- Out of stock = critical; low but non-zero = medium
    v_severity := CASE WHEN v_qty = 0 THEN 'critical' ELSE 'medium' END;
    v_message  := v_name || ': ' || v_qty || ' remaining (min ' || v_threshold || ')';

    -- Update severity/message on existing open alert
    UPDATE inventory_alerts
    SET severity = v_severity, message = v_message
    WHERE property_id = p_property_id AND item_id = p_item_id
      AND alert_type = 'low_stock' AND resolved_at IS NULL;

    -- Insert if none open yet
    INSERT INTO inventory_alerts (property_id, item_id, alert_type, severity, message)
    SELECT p_property_id, p_item_id, 'low_stock', v_severity, v_message
    WHERE NOT EXISTS (
      SELECT 1 FROM inventory_alerts
      WHERE property_id = p_property_id AND item_id = p_item_id
        AND alert_type = 'low_stock' AND resolved_at IS NULL
    );
  ELSE
    -- Back above threshold — auto-resolve
    UPDATE inventory_alerts SET resolved_at = now()
    WHERE  property_id = p_property_id AND item_id = p_item_id
      AND  alert_type = 'low_stock' AND resolved_at IS NULL;
  END IF;
END;
$$;

-- ─── Intelligence: recurring damage (counts distinct events, not rows) ────────

CREATE OR REPLACE FUNCTION check_recurring_damage(p_property_id UUID, p_item_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_count    INTEGER;
  v_name     TEXT;
  v_severity TEXT;
  v_message  TEXT;
BEGIN
  -- Count distinct source events (one turnover = one event, even if multiple rows)
  SELECT COUNT(DISTINCT source_id) INTO v_count
  FROM   inventory_transactions
  WHERE  property_id = p_property_id AND item_id = p_item_id
    AND  reason      = 'turnover_damage'
    AND  created_at  > now() - INTERVAL '90 days';

  IF v_count >= 3 THEN
    SELECT name INTO v_name FROM inventory_items WHERE id = p_item_id;
    -- 5+ occurrences = critical pattern needing supplier/process change
    v_severity := CASE WHEN v_count >= 5 THEN 'critical' ELSE 'medium' END;
    v_message  := v_name || ' damaged ' || v_count || '× in the last 90 days';

    UPDATE inventory_alerts
    SET severity = v_severity, message = v_message
    WHERE property_id = p_property_id AND item_id = p_item_id
      AND alert_type = 'recurring_damage' AND resolved_at IS NULL;

    INSERT INTO inventory_alerts (property_id, item_id, alert_type, severity, message)
    SELECT p_property_id, p_item_id, 'recurring_damage', v_severity, v_message
    WHERE NOT EXISTS (
      SELECT 1 FROM inventory_alerts
      WHERE property_id = p_property_id AND item_id = p_item_id
        AND alert_type = 'recurring_damage' AND resolved_at IS NULL
    );
  END IF;
END;
$$;

-- ─── Intelligence: auto-resolve stale recurring_damage alerts ─────────────────
-- Call this periodically (e.g. daily cron). Resolves if no damage in 30 days.

CREATE OR REPLACE FUNCTION auto_resolve_stale_alerts()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE inventory_alerts ia
  SET resolved_at = now()
  WHERE ia.alert_type  = 'recurring_damage'
    AND ia.resolved_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM inventory_transactions it
      WHERE  it.property_id = ia.property_id
        AND  it.item_id     = ia.item_id
        AND  it.reason      = 'turnover_damage'
        AND  it.created_at  > now() - INTERVAL '30 days'
    );
END;
$$;

-- ─── Trigger 1: turnover damage ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_turnover_damage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_property_id UUID;
BEGIN
  SELECT property_id INTO v_property_id
  FROM   turnover_tasks WHERE id = NEW.turnover_task_id;

  INSERT INTO property_inventory (property_id, item_id, quantity, damaged_quantity)
  VALUES (
    v_property_id, NEW.item_id, 0,
    CASE WHEN NEW.condition = 'damaged' THEN NEW.quantity ELSE 0 END
  )
  ON CONFLICT (property_id, item_id) DO UPDATE SET
    quantity = GREATEST(0,
      property_inventory.quantity -
      CASE WHEN NEW.condition IN ('damaged','missing') THEN NEW.quantity ELSE 0 END
    ),
    damaged_quantity = property_inventory.damaged_quantity +
      CASE WHEN NEW.condition = 'damaged' THEN NEW.quantity ELSE 0 END,
    updated_at = now();

  INSERT INTO inventory_transactions
    (property_id, item_id, delta, delta_damaged, reason, source_type, source_id, notes)
  VALUES (
    v_property_id, NEW.item_id,
    CASE WHEN NEW.condition IN ('damaged','missing') THEN -NEW.quantity ELSE 0 END,
    CASE WHEN NEW.condition = 'damaged'              THEN  NEW.quantity ELSE 0 END,
    'turnover_damage', 'turnover_task', NEW.turnover_task_id, NEW.notes
  );

  PERFORM update_usage_rate(v_property_id, NEW.item_id);
  PERFORM check_low_stock(v_property_id, NEW.item_id);
  PERFORM check_recurring_damage(v_property_id, NEW.item_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_turnover_damage_insert ON turnover_damage_items;
CREATE TRIGGER on_turnover_damage_insert
AFTER INSERT ON turnover_damage_items
FOR EACH ROW EXECUTE FUNCTION handle_turnover_damage();

-- ─── Trigger 2a: maintenance item flagged ────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_maintenance_item_flagged()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_property_id UUID;
  v_name        TEXT;
BEGIN
  SELECT property_id INTO v_property_id
  FROM   maintenance_tickets WHERE id = NEW.ticket_id;

  SELECT name INTO v_name FROM inventory_items WHERE id = NEW.item_id;

  INSERT INTO property_inventory (property_id, item_id, quantity, damaged_quantity)
  VALUES (v_property_id, NEW.item_id, 0, NEW.quantity)
  ON CONFLICT (property_id, item_id) DO UPDATE SET
    damaged_quantity = property_inventory.damaged_quantity + NEW.quantity,
    updated_at = now();

  INSERT INTO inventory_transactions
    (property_id, item_id, delta, delta_damaged, reason, source_type, source_id)
  VALUES (
    v_property_id, NEW.item_id, 0, NEW.quantity,
    'maintenance_flagged', 'maintenance_ticket', NEW.ticket_id
  );

  INSERT INTO inventory_alerts (property_id, item_id, alert_type, severity, message, source_type, source_id)
  SELECT v_property_id, NEW.item_id, 'out_of_service', 'medium',
         v_name || ' out of service',
         'maintenance_ticket', NEW.ticket_id
  WHERE NOT EXISTS (
    SELECT 1 FROM inventory_alerts
    WHERE property_id = v_property_id AND item_id = NEW.item_id
      AND alert_type = 'out_of_service' AND resolved_at IS NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_maintenance_item_insert ON maintenance_ticket_items;
CREATE TRIGGER on_maintenance_item_insert
AFTER INSERT ON maintenance_ticket_items
FOR EACH ROW EXECUTE FUNCTION handle_maintenance_item_flagged();

-- ─── Trigger 2b: maintenance item resolved ───────────────────────────────────

CREATE OR REPLACE FUNCTION handle_maintenance_item_resolved()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_property_id UUID;
BEGIN
  IF OLD.resolved_at IS NULL AND NEW.resolved_at IS NOT NULL THEN
    SELECT property_id INTO v_property_id
    FROM   maintenance_tickets WHERE id = NEW.ticket_id;

    UPDATE property_inventory SET
      damaged_quantity = GREATEST(0, damaged_quantity - NEW.quantity),
      updated_at = now()
    WHERE property_id = v_property_id AND item_id = NEW.item_id;

    INSERT INTO inventory_transactions
      (property_id, item_id, delta, delta_damaged, reason, source_type, source_id)
    VALUES (
      v_property_id, NEW.item_id, 0, -NEW.quantity,
      'maintenance_resolved', 'maintenance_ticket', NEW.ticket_id
    );

    UPDATE inventory_alerts SET resolved_at = now()
    WHERE  property_id = v_property_id AND item_id = NEW.item_id
      AND  alert_type = 'out_of_service' AND resolved_at IS NULL;

    -- Re-run low-stock check in case resolved item was the last one
    PERFORM check_low_stock(v_property_id, NEW.item_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_maintenance_item_resolved ON maintenance_ticket_items;
CREATE TRIGGER on_maintenance_item_resolved
AFTER UPDATE ON maintenance_ticket_items
FOR EACH ROW EXECUTE FUNCTION handle_maintenance_item_resolved();

-- ─── Trigger 3: service fulfilled → deduct supply manifest ───────────────────

CREATE OR REPLACE FUNCTION handle_service_fulfilled()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_property_id UUID;
  v_supply      RECORD;
BEGIN
  IF OLD.status <> 'fulfilled' AND NEW.status = 'fulfilled' THEN
    SELECT b.property_id INTO v_property_id
    FROM   bookings b WHERE b.id = NEW.booking_id;

    FOR v_supply IN
      SELECT ss.item_id, (ss.quantity_per_unit * NEW.quantity) AS total
      FROM   service_supplies ss
      WHERE  ss.service_id = NEW.service_id
    LOOP
      INSERT INTO property_inventory (property_id, item_id, quantity, damaged_quantity)
      VALUES (v_property_id, v_supply.item_id, 0, 0)
      ON CONFLICT (property_id, item_id) DO UPDATE SET
        quantity   = GREATEST(0, property_inventory.quantity - v_supply.total),
        updated_at = now();

      INSERT INTO inventory_transactions
        (property_id, item_id, delta, reason, source_type, source_id)
      VALUES (
        v_property_id, v_supply.item_id, -v_supply.total,
        'service_fulfillment', 'service_request', NEW.id
      );

      PERFORM update_usage_rate(v_property_id, v_supply.item_id);
      PERFORM check_low_stock(v_property_id, v_supply.item_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_service_request_fulfilled ON service_requests;
CREATE TRIGGER on_service_request_fulfilled
AFTER UPDATE ON service_requests
FOR EACH ROW EXECUTE FUNCTION handle_service_fulfilled();

-- ─── Trigger 4: restock → resolve low_stock alert + track restock date ────────

CREATE OR REPLACE FUNCTION handle_inventory_restock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_threshold INTEGER;
BEGIN
  IF NEW.quantity > OLD.quantity THEN
    SELECT COALESCE(NEW.reorder_threshold, ii.reorder_threshold_default)
    INTO   v_threshold
    FROM   inventory_items ii WHERE ii.id = NEW.item_id;

    IF NEW.quantity > v_threshold THEN
      UPDATE inventory_alerts SET resolved_at = now()
      WHERE  property_id = NEW.property_id AND item_id = NEW.item_id
        AND  alert_type = 'low_stock' AND resolved_at IS NULL;
    END IF;

    UPDATE property_inventory
    SET last_restocked_at = now()
    WHERE property_id = NEW.property_id AND item_id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_property_inventory_update ON property_inventory;
CREATE TRIGGER on_property_inventory_update
AFTER UPDATE ON property_inventory
FOR EACH ROW EXECUTE FUNCTION handle_inventory_restock();

-- ─── View: per-property inventory health score ────────────────────────────────

CREATE OR REPLACE VIEW inventory_health AS
SELECT
  p.id   AS property_id,
  p.name AS property_name,
  COUNT(pi.id)                                                                        AS tracked_items,
  COUNT(pi.id) FILTER (WHERE pi.quantity = 0)                                         AS out_of_stock,
  COUNT(pi.id) FILTER (WHERE pi.quantity > 0
    AND pi.quantity <= COALESCE(pi.reorder_threshold, ii.reorder_threshold_default))  AS low_stock,
  COUNT(DISTINCT ia.id) FILTER (WHERE ia.resolved_at IS NULL AND ia.severity = 'critical') AS critical_alerts,
  COUNT(DISTINCT ia.id) FILTER (WHERE ia.resolved_at IS NULL)                         AS open_alerts,
  CASE
    WHEN COUNT(DISTINCT ia.id) FILTER (WHERE ia.resolved_at IS NULL AND ia.severity = 'critical') > 0
      THEN 'critical'
    WHEN COUNT(DISTINCT ia.id) FILTER (WHERE ia.resolved_at IS NULL) > 0
      THEN 'attention'
    WHEN COUNT(pi.id) > 0
      THEN 'healthy'
    ELSE 'untracked'
  END AS health_status
FROM       properties        p
LEFT JOIN  property_inventory pi ON pi.property_id = p.id
LEFT JOIN  inventory_items    ii ON ii.id = pi.item_id
LEFT JOIN  inventory_alerts   ia ON ia.property_id = p.id
GROUP BY   p.id, p.name;
