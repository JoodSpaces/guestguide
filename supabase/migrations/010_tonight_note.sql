-- Tonight note: a daily one-liner set by the property admin,
-- shown on the guest home screen during the living phase.
alter table properties
  add column if not exists tonight_note    text,
  add column if not exists tonight_note_ar text;
