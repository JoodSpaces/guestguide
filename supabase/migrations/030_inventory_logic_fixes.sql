-- ─── 030_inventory_logic_fixes.sql ───────────────────────────────────────────
-- Idempotent — safe to re-run.
--
-- WHAT THE INVENTORY MEANS (one definition, used by the database, the API and the screen)
--   • property_inventory.quantity  = usable units on hand. The ONLY stock number that is written.
--     inventory_items.current_stock is a mirror of it, kept by a trigger.
--   • inventory_items.par_level    = the level to keep. Stock BELOW par is "low"; 0 (with a par set) is "out".
--     par 0 means "not tracked for alerts". There is no separate hidden threshold any more.
--   • A unit reported damaged leaves `quantity` and moves into `damaged_quantity`; a missing unit just leaves.
--   • Every change to quantity leaves a row in inventory_transactions, including hand edits.
--
-- WHAT WAS WRONG (found in the 2026-09-30 inventory audit)
--   1. Two different low-stock rules: the screen said "low" below par, the database raised an alert AT par
--      ("5 remaining (min 5)"), using a hidden default of 5 when no threshold was set.
--   2. avg_daily_usage divided by "days since the first transaction" (min 1 day), so one day of use read as
--      11 per day, and damaged items counted as consumption.
--   3. Deleting a damage record restored the full quantity even when the stock had been clamped at 0, and for
--      "needs_cleaning" (which never removed anything), so stock drifted upward; the damaged counter was not reversed.
--   4. Recurring damage counted "needs_cleaning" and reversed records, and never cleared itself.
--   5. Hand edits wrote an absolute number with no record, and a stale screen could overwrite a change made
--      meanwhile by a turnover or a service.
--   6. inventory_health multiplied rows (every item × every alert ever raised), so its counts were inflated.
--   7. A damage record could name another property's item and corrupt that stock.
--   8. Two open alerts of one type for one item could appear at the same time (no uniqueness).
--   9. A trigger that exists in the live database (sync_current_stock) was in no migration.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 0. Bring the repo in line with the live database ───────────────────────
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS reorder_threshold_default INTEGER NOT NULL DEFAULT 5,   -- deprecated: par_level is the threshold
  ADD COLUMN IF NOT EXISTS name_ar     TEXT,
  ADD COLUMN IF NOT EXISTS icon        TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;                                 -- "removed" items keep their history

CREATE OR REPLACE FUNCTION sync_current_stock() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE inventory_items SET current_stock = NEW.quantity WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_property_inventory_sync_stock ON property_inventory;
CREATE TRIGGER on_property_inventory_sync_stock
AFTER INSERT OR UPDATE OF quantity ON property_inventory
FOR EACH ROW EXECUTE FUNCTION sync_current_stock();

-- One live item per name per property ("Cups" twice made every count ambiguous).
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_items_name
  ON inventory_items (property_id, lower(btrim(name))) WHERE archived_at IS NULL;

-- One open alert of a type per item (the old "insert if none open" check could race).
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_alerts_open
  ON inventory_alerts (property_id, item_id, alert_type) WHERE resolved_at IS NULL;

-- ─── 1. Low stock: ONE rule ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_low_stock(p_property_id UUID, p_item_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_qty      INTEGER;
  v_par      INTEGER;
  v_name     TEXT;
  v_archived TIMESTAMPTZ;
  v_severity TEXT;
  v_message  TEXT;
BEGIN
  SELECT pi.quantity, ii.par_level, ii.name, ii.archived_at
  INTO   v_qty, v_par, v_name, v_archived
  FROM   property_inventory pi
  JOIN   inventory_items ii ON ii.id = pi.item_id
  WHERE  pi.property_id = p_property_id AND pi.item_id = p_item_id;

  -- Nothing to warn about: untracked, archived, no par set, or at/above par → close any open alert.
  IF v_qty IS NULL OR v_archived IS NOT NULL OR COALESCE(v_par, 0) <= 0 OR v_qty >= v_par THEN
    UPDATE inventory_alerts SET resolved_at = now()
    WHERE  property_id = p_property_id AND item_id = p_item_id
      AND  alert_type = 'low_stock' AND resolved_at IS NULL;
    RETURN;
  END IF;

  v_severity := CASE WHEN v_qty = 0 THEN 'critical' ELSE 'medium' END;
  v_message  := v_name || ': ' || v_qty || ' of ' || v_par || CASE WHEN v_qty = 0 THEN ' (out of stock)' ELSE ' (below par)' END;

  UPDATE inventory_alerts SET severity = v_severity, message = v_message
  WHERE  property_id = p_property_id AND item_id = p_item_id
    AND  alert_type = 'low_stock' AND resolved_at IS NULL;

  INSERT INTO inventory_alerts (property_id, item_id, alert_type, severity, message)
  VALUES (p_property_id, p_item_id, 'low_stock', v_severity, v_message)
  ON CONFLICT DO NOTHING;
END;
$$;

-- ─── 2. Usage rate: consumption only, over a sensible window ────────────────
-- Only services that used supplies count (damage and hand edits are not consumption). The divisor is at least
-- 14 days, so a single busy day cannot read as a daily habit, and at most 90 days.
CREATE OR REPLACE FUNCTION update_usage_rate(p_property_id UUID, p_item_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_used  NUMERIC;
  v_first TIMESTAMPTZ;
  v_days  NUMERIC;
BEGIN
  SELECT COALESCE(SUM(-delta), 0), MIN(created_at)
  INTO   v_used, v_first
  FROM   inventory_transactions
  WHERE  property_id = p_property_id AND item_id = p_item_id
    AND  reason = 'service_fulfillment' AND delta < 0
    AND  created_at > now() - INTERVAL '90 days';

  v_days := LEAST(90, GREATEST(14, EXTRACT(EPOCH FROM (now() - COALESCE(v_first, now()))) / 86400.0));

  UPDATE property_inventory SET avg_daily_usage = ROUND(v_used / v_days, 2)
  WHERE  property_id = p_property_id AND item_id = p_item_id;
END;
$$;

-- ─── 3. Recurring damage: real damage events that still stand ───────────────
-- Counted from the live damage records (so a deleted record stops counting), only "damaged" and "missing"
-- (cleaning is not damage), one per turnover. Clears itself when the count drops below 3.
CREATE OR REPLACE FUNCTION check_recurring_damage(p_property_id UUID, p_item_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_count    INTEGER;
  v_name     TEXT;
  v_severity TEXT;
  v_message  TEXT;
BEGIN
  SELECT COUNT(DISTINCT tdi.turnover_task_id) INTO v_count
  FROM   turnover_damage_items tdi
  JOIN   turnover_tasks tt ON tt.id = tdi.turnover_task_id
  WHERE  tt.property_id = p_property_id AND tdi.item_id = p_item_id
    AND  tdi.condition IN ('damaged', 'missing')
    AND  tdi.created_at > now() - INTERVAL '90 days';

  IF v_count < 3 THEN
    UPDATE inventory_alerts SET resolved_at = now()
    WHERE  property_id = p_property_id AND item_id = p_item_id
      AND  alert_type = 'recurring_damage' AND resolved_at IS NULL;
    RETURN;
  END IF;

  SELECT name INTO v_name FROM inventory_items WHERE id = p_item_id;
  v_severity := CASE WHEN v_count >= 5 THEN 'critical' ELSE 'medium' END;
  v_message  := v_name || ' damaged or missing ' || v_count || '× in the last 90 days';

  UPDATE inventory_alerts SET severity = v_severity, message = v_message
  WHERE  property_id = p_property_id AND item_id = p_item_id
    AND  alert_type = 'recurring_damage' AND resolved_at IS NULL;

  INSERT INTO inventory_alerts (property_id, item_id, alert_type, severity, message)
  VALUES (p_property_id, p_item_id, 'recurring_damage', v_severity, v_message)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Daily job (scheduled in 021): same basis as above, a looser 30-day window to retire an old pattern.
CREATE OR REPLACE FUNCTION auto_resolve_stale_alerts()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE inventory_alerts ia
  SET resolved_at = now()
  WHERE ia.alert_type  = 'recurring_damage'
    AND ia.resolved_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM turnover_damage_items tdi
      JOIN   turnover_tasks tt ON tt.id = tdi.turnover_task_id
      WHERE  tt.property_id = ia.property_id AND tdi.item_id = ia.item_id
        AND  tdi.condition IN ('damaged', 'missing')
        AND  tdi.created_at > now() - INTERVAL '30 days'
    );
END;
$$;

-- ─── 4. Damage recorded on a turnover ───────────────────────────────────────
-- Records what REALLY left the stock (it cannot go below zero), so a reversal puts back exactly that.
CREATE OR REPLACE FUNCTION handle_turnover_damage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_property_id UUID;
  v_have        INTEGER;
  v_take        INTEGER;
  v_damaged     INTEGER;
BEGIN
  SELECT property_id INTO v_property_id FROM turnover_tasks WHERE id = NEW.turnover_task_id;

  IF NOT EXISTS (SELECT 1 FROM inventory_items WHERE id = NEW.item_id AND property_id = v_property_id) THEN
    RAISE EXCEPTION 'That item does not belong to this property';
  END IF;

  INSERT INTO property_inventory (property_id, item_id, quantity, damaged_quantity)
  VALUES (v_property_id, NEW.item_id, 0, 0)
  ON CONFLICT (property_id, item_id) DO NOTHING;

  SELECT quantity INTO v_have FROM property_inventory
  WHERE property_id = v_property_id AND item_id = NEW.item_id FOR UPDATE;

  v_take    := CASE WHEN NEW.condition IN ('damaged', 'missing') THEN LEAST(v_have, NEW.quantity) ELSE 0 END;
  v_damaged := CASE WHEN NEW.condition = 'damaged' THEN NEW.quantity ELSE 0 END;

  UPDATE property_inventory
  SET    quantity = quantity - v_take, damaged_quantity = damaged_quantity + v_damaged, updated_at = now()
  WHERE  property_id = v_property_id AND item_id = NEW.item_id;

  INSERT INTO inventory_transactions
    (property_id, item_id, delta, delta_damaged, reason, source_type, source_id, notes)
  VALUES (v_property_id, NEW.item_id, -v_take, v_damaged, 'turnover_damage', 'turnover_task', NEW.turnover_task_id, NEW.notes);

  PERFORM check_low_stock(v_property_id, NEW.item_id);
  PERFORM check_recurring_damage(v_property_id, NEW.item_id);
  RETURN NEW;
END;
$$;

-- ─── 5. Damage record deleted: undo exactly what it did ─────────────────────
CREATE OR REPLACE FUNCTION handle_turnover_damage_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_property_id UUID;
  v_delta       INTEGER;
  v_damaged     INTEGER;
  v_tx          RECORD;
BEGIN
  SELECT property_id INTO v_property_id FROM turnover_tasks WHERE id = OLD.turnover_task_id;
  IF v_property_id IS NULL THEN RETURN OLD; END IF;    -- the whole turnover is being deleted

  SELECT delta, delta_damaged INTO v_tx
  FROM   inventory_transactions
  WHERE  reason = 'turnover_damage' AND source_type = 'turnover_task'
    AND  source_id = OLD.turnover_task_id AND item_id = OLD.item_id
  ORDER  BY created_at DESC LIMIT 1;

  IF FOUND THEN
    v_delta := v_tx.delta;  v_damaged := v_tx.delta_damaged;
  ELSE                                                  -- a record from before transactions were kept: best estimate
    v_delta   := CASE WHEN OLD.condition IN ('damaged', 'missing') THEN -OLD.quantity ELSE 0 END;
    v_damaged := CASE WHEN OLD.condition = 'damaged' THEN OLD.quantity ELSE 0 END;
  END IF;

  UPDATE property_inventory
  SET    quantity = quantity - v_delta, damaged_quantity = GREATEST(0, damaged_quantity - v_damaged), updated_at = now()
  WHERE  property_id = v_property_id AND item_id = OLD.item_id;

  INSERT INTO inventory_transactions
    (property_id, item_id, delta, delta_damaged, reason, source_type, source_id, notes)
  VALUES (v_property_id, OLD.item_id, -v_delta, -v_damaged, 'manual_adjustment', 'turnover_task', OLD.turnover_task_id,
          'Reversed: damage record deleted from turnover ' || OLD.turnover_task_id);

  PERFORM check_low_stock(v_property_id, OLD.item_id);
  PERFORM check_recurring_damage(v_property_id, OLD.item_id);
  RETURN OLD;
END;
$$;

-- ─── 6. Restock: stamp the date, and re-check once, through the same rule ───
CREATE OR REPLACE FUNCTION handle_inventory_restock_stamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quantity > OLD.quantity THEN NEW.last_restocked_at := now(); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_property_inventory_update ON property_inventory;
DROP FUNCTION IF EXISTS handle_inventory_restock();        -- replaced by the two small triggers below
DROP TRIGGER IF EXISTS on_property_inventory_restock_stamp ON property_inventory;
CREATE TRIGGER on_property_inventory_restock_stamp
BEFORE UPDATE OF quantity ON property_inventory
FOR EACH ROW EXECUTE FUNCTION handle_inventory_restock_stamp();

CREATE OR REPLACE FUNCTION handle_inventory_quantity_changed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM check_low_stock(NEW.property_id, NEW.item_id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_property_inventory_quantity_changed ON property_inventory;
CREATE TRIGGER on_property_inventory_quantity_changed
AFTER INSERT OR UPDATE OF quantity ON property_inventory
FOR EACH ROW EXECUTE FUNCTION handle_inventory_quantity_changed();

-- ─── 7. Hand edits: atomic, recorded, and immune to a stale screen ──────────
-- Give exactly one of p_delta ("+3", "-1": relative, safe against concurrent changes) or p_set (a recount).
-- The row is locked, the change is written with who did it, and the low-stock rule is applied. Returns the new quantity.
CREATE OR REPLACE FUNCTION adjust_inventory(
  p_property_id UUID, p_item_id UUID,
  p_delta INTEGER DEFAULT NULL, p_set INTEGER DEFAULT NULL,
  p_actor TEXT DEFAULT 'admin', p_note TEXT DEFAULT NULL
) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  v_old INTEGER;
  v_new INTEGER;
BEGIN
  IF (p_delta IS NULL) = (p_set IS NULL) THEN RAISE EXCEPTION 'Give exactly one of delta or set'; END IF;
  IF p_set IS NOT NULL AND p_set < 0 THEN RAISE EXCEPTION 'Stock cannot be negative'; END IF;

  IF NOT EXISTS (SELECT 1 FROM inventory_items WHERE id = p_item_id AND property_id = p_property_id AND archived_at IS NULL) THEN
    RAISE EXCEPTION 'Unknown item';
  END IF;

  INSERT INTO property_inventory (property_id, item_id, quantity, damaged_quantity)
  VALUES (p_property_id, p_item_id, 0, 0)
  ON CONFLICT (property_id, item_id) DO NOTHING;

  SELECT quantity INTO v_old FROM property_inventory
  WHERE property_id = p_property_id AND item_id = p_item_id FOR UPDATE;

  v_new := GREATEST(0, CASE WHEN p_set IS NOT NULL THEN p_set ELSE v_old + p_delta END);
  IF v_new = v_old THEN
    PERFORM check_low_stock(p_property_id, p_item_id);
    RETURN v_old;
  END IF;

  UPDATE property_inventory SET quantity = v_new, updated_at = now()
  WHERE property_id = p_property_id AND item_id = p_item_id;

  INSERT INTO inventory_transactions (property_id, item_id, delta, reason, notes, created_by)
  VALUES (p_property_id, p_item_id, v_new - v_old,
          CASE WHEN v_new > v_old THEN 'manual_restock' ELSE 'manual_adjustment' END,
          p_note, COALESCE(NULLIF(btrim(p_actor), ''), 'admin'));

  RETURN v_new;
END;
$$;

-- ─── 8. Health view without row multiplication ──────────────────────────────
CREATE OR REPLACE VIEW inventory_health AS
SELECT
  p.id   AS property_id,
  p.name AS property_name,
  COALESCE(s.tracked_items, 0)  AS tracked_items,
  COALESCE(s.out_of_stock, 0)   AS out_of_stock,
  COALESCE(s.low_stock, 0)      AS low_stock,
  COALESCE(a.critical_alerts, 0) AS critical_alerts,
  COALESCE(a.open_alerts, 0)     AS open_alerts,
  CASE
    WHEN COALESCE(a.critical_alerts, 0) > 0 THEN 'critical'
    WHEN COALESCE(a.open_alerts, 0) > 0     THEN 'attention'
    WHEN COALESCE(s.tracked_items, 0) > 0   THEN 'healthy'
    ELSE 'untracked'
  END AS health_status
FROM properties p
LEFT JOIN (
  SELECT pi.property_id,
         COUNT(*)                                                                       AS tracked_items,
         COUNT(*) FILTER (WHERE ii.par_level > 0 AND pi.quantity = 0)                   AS out_of_stock,
         COUNT(*) FILTER (WHERE ii.par_level > 0 AND pi.quantity > 0 AND pi.quantity < ii.par_level) AS low_stock
  FROM   property_inventory pi
  JOIN   inventory_items ii ON ii.id = pi.item_id AND ii.archived_at IS NULL
  GROUP  BY pi.property_id
) s ON s.property_id = p.id
LEFT JOIN (
  SELECT property_id,
         COUNT(*) FILTER (WHERE severity = 'critical') AS critical_alerts,
         COUNT(*)                                      AS open_alerts
  FROM   inventory_alerts WHERE resolved_at IS NULL
  GROUP  BY property_id
) a ON a.property_id = p.id;

-- ─── 9. Functions are for the server only ───────────────────────────────────
REVOKE EXECUTE ON FUNCTION adjust_inventory(UUID, UUID, INTEGER, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION adjust_inventory(UUID, UUID, INTEGER, INTEGER, TEXT, TEXT) TO service_role;

-- ─── 10. Repair what the old rules left behind ──────────────────────────────
-- (a) mirror the stock number, (b) re-evaluate every tracked item under the new rules.
UPDATE inventory_items ii SET current_stock = pi.quantity
FROM   property_inventory pi
WHERE  pi.item_id = ii.id AND ii.current_stock IS DISTINCT FROM pi.quantity;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT property_id, item_id FROM property_inventory LOOP
    PERFORM update_usage_rate(r.property_id, r.item_id);
    PERFORM check_low_stock(r.property_id, r.item_id);
    PERFORM check_recurring_damage(r.property_id, r.item_id);
  END LOOP;
END $$;
