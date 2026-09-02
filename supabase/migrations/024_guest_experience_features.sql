-- Feature: Do Not Disturb toggle (guest-controlled)
alter table bookings
  add column if not exists dnd_active boolean not null default false;

-- Feature: Host's Live Pick (per-property editorial recommendation)
alter table properties
  add column if not exists host_pick     text,
  add column if not exists host_pick_ar  text;

-- Feature: Pre-Arrival Customization
create table if not exists arrival_preferences (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references bookings(id) on delete cascade,
  occasion     text check (occasion in ('leisure','business','honeymoon','birthday','anniversary','family','other')),
  temp_pref    text check (temp_pref in ('cool','warm','any')),
  notes        text,
  submitted_at timestamptz not null default now(),
  unique (booking_id)
);
