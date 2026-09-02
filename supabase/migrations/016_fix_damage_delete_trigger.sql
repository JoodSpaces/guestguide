-- Fix the compensating INSERT in handle_turnover_damage_delete().
-- Migration 009 used column names that don't exist in inventory_transactions
-- (transaction_type, quantity_change, reference_type, reference_id).
-- The correct columns from migration 006 are: delta, reason, source_type, source_id.

CREATE OR REPLACE FUNCTION handle_turnover_damage_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_property_id uuid;
BEGIN
  SELECT property_id INTO v_property_id
    FROM turnover_tasks WHERE id = OLD.turnover_task_id;

  IF v_property_id IS NULL THEN
    RETURN OLD;
  END IF;

  -- Restore quantity deducted when the damage item was originally recorded
  UPDATE property_inventory
    SET quantity   = quantity + OLD.quantity,
        updated_at = now()
    WHERE property_id = v_property_id
      AND item_id     = OLD.item_id;

  -- Record compensating transaction with the actual column names from migration 006
  INSERT INTO inventory_transactions (
    property_id, item_id, delta, delta_damaged, reason, source_type, source_id, notes
  ) VALUES (
    v_property_id,
    OLD.item_id,
    OLD.quantity,
    0,
    'manual_adjustment',
    'turnover_task',
    OLD.id,
    'Reversed: damage record deleted from turnover ' || OLD.turnover_task_id
  );

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_turnover_damage_delete ON turnover_damage_items;
CREATE TRIGGER on_turnover_damage_delete
  AFTER DELETE ON turnover_damage_items
  FOR EACH ROW EXECUTE FUNCTION handle_turnover_damage_delete();
