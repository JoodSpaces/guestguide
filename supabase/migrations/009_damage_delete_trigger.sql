-- Reverse inventory deduction when a damage item is deleted.
-- The INSERT trigger (migration 006) deducts quantity from property_inventory
-- and creates an inventory_transaction. This trigger creates the compensating
-- credit so counts stay accurate after damage corrections.

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

  -- Restore quantity (cap at 0 floor handled by GREATEST on deduct side;
  -- a straight add is correct for the reversal)
  UPDATE property_inventory
    SET quantity    = quantity + OLD.quantity,
        updated_at  = now()
    WHERE property_id = v_property_id
      AND item_id     = OLD.item_id;

  -- Record compensating transaction
  INSERT INTO inventory_transactions (
    property_id, item_id, transaction_type, quantity_change,
    reference_type, reference_id, notes
  ) VALUES (
    v_property_id, OLD.item_id, 'damage_reversal', OLD.quantity,
    'turnover_damage_delete', OLD.id,
    'Reversed: damage record deleted from turnover ' || OLD.turnover_task_id
  );

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_turnover_damage_delete ON turnover_damage_items;
CREATE TRIGGER on_turnover_damage_delete
  AFTER DELETE ON turnover_damage_items
  FOR EACH ROW EXECUTE FUNCTION handle_turnover_damage_delete();
