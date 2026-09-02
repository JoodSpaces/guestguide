-- Add optional property scope to team members.
-- NULL means the member has access to all properties (admin-level or unscoped ops).
-- A populated array restricts them to only those property UUIDs.
alter table team_members
  add column if not exists property_ids uuid[] default null;
