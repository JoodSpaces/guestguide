-- 025_master_admin: protect the original admin account from deletion/demotion
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS is_owner boolean NOT NULL DEFAULT false;

-- Set the "admin" account as the master admin (owner). Safe to re-run.
UPDATE team_members
SET    is_owner = true
WHERE  name = 'admin';
