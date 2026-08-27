CREATE TABLE IF NOT EXISTS team_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  role        text NOT NULL CHECK (role IN ('admin', 'ops', 'concierge')),
  password_hash text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_members_name ON team_members (lower(name));
