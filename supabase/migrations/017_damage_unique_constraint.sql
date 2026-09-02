-- Prevent the same inventory item from being recorded as damaged twice
-- in a single turnover task. Without this a double-insert would fire the
-- handle_turnover_damage trigger twice, deducting stock twice for one event.
alter table turnover_damage_items
  add constraint uq_turnover_damage_item
  unique (turnover_task_id, item_id);
