-- 026_property_specs: per-property cleaning specs for dynamic checklists
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS specs jsonb NOT NULL DEFAULT '{}';

COMMENT ON COLUMN properties.specs IS
  'Cleaning specs: {rooms:[{id,type,name}], has_pool, has_outdoor, kitchen_type}';
