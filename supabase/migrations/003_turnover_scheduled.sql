-- Add 'scheduled' as a valid turnover status (created when booking is confirmed,
-- before checkout happens, so ops team can plan ahead)
ALTER TABLE turnover_tasks DROP CONSTRAINT IF EXISTS turnover_tasks_status_check;
ALTER TABLE turnover_tasks ADD CONSTRAINT turnover_tasks_status_check
  CHECK (status IN ('scheduled', 'pending', 'in_progress', 'ready', 'approved'));
