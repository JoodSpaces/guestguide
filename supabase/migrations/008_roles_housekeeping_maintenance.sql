-- Expand team_members role CHECK constraint to include housekeeping and maintenance
ALTER TABLE team_members
  DROP CONSTRAINT IF EXISTS team_members_role_check;

ALTER TABLE team_members
  ADD CONSTRAINT team_members_role_check
  CHECK (role IN ('admin', 'ops', 'housekeeping', 'maintenance', 'concierge'));
