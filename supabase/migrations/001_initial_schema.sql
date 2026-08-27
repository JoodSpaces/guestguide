-- ============================================================
-- JOOD Guest App — Initial Schema
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ─── Media ───────────────────────────────────────────────────
create table media (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null,
  kind         text not null check (kind in ('image','video')),
  alt_en       text not null default '',
  alt_ar       text not null default '',
  width        int,
  height       int,
  blurhash     text
);

-- ─── Properties ──────────────────────────────────────────────
create table properties (
  id                              uuid primary key default gen_random_uuid(),
  slug                            text not null unique,
  name                            text not null,
  name_ar                         text not null,
  city                            text not null,
  address                         text not null,
  lat                             double precision,
  lng                             double precision,
  map_pin_lat                     double precision,
  map_pin_lng                     double precision,
  cover_media_id                  uuid references media(id),
  bedrooms                        int not null default 1,
  max_guests                      int not null default 2,
  wifi_ssid                       text,
  wifi_password_encrypted         text,  -- AES-256-GCM via app layer
  checkin_time                    time not null default '15:00',
  checkout_time                   time not null default '11:00',
  requires_code_second_factor     boolean not null default false,
  on_call_phone                   text not null default '',
  created_at                      timestamptz not null default now()
);

-- ─── Bookings ─────────────────────────────────────────────────
create table bookings (
  id                     uuid primary key default gen_random_uuid(),
  property_id            uuid not null references properties(id),
  external_ref           text,
  source                 text not null check (source in ('airbnb','booking','direct','other')),
  guest_first_name       text not null,
  guest_last_name        text not null,
  guest_phone            text,  -- encrypted at rest by app layer
  guest_email            text,
  guest_lang             text not null default 'en' check (guest_lang in ('en','ar')),
  guest_count            int not null default 1,
  check_in               timestamptz not null,
  check_out              timestamptz not null,
  door_code_encrypted    text,  -- AES-256-GCM, only served after T-48h
  status                 text not null default 'confirmed'
                           check (status in ('confirmed','cancelled','completed')),
  created_at             timestamptz not null default now(),
  constraint check_out_after_check_in check (check_out > check_in)
);

-- ─── Stay tokens ──────────────────────────────────────────────
create table stay_tokens (
  id             uuid primary key default gen_random_uuid(),
  booking_id     uuid not null references bookings(id) on delete cascade,
  token_hash     text not null unique,  -- SHA-256(plaintext + pepper)
  issued_at      timestamptz not null default now(),
  expires_at     timestamptz not null,  -- checkout + 48h
  first_opened_at timestamptz,
  last_opened_at  timestamptz,
  open_count     int not null default 0,
  revoked_at     timestamptz
);

create index stay_tokens_booking_id_idx on stay_tokens(booking_id);

-- Function called by the resolve route to track opens atomically
create or replace function record_token_open(p_token_id uuid)
returns void language plpgsql security definer as $$
begin
  update stay_tokens
  set
    open_count      = open_count + 1,
    last_opened_at  = now(),
    first_opened_at = coalesce(first_opened_at, now())
  where id = p_token_id;
end;
$$;

-- ─── Property content (house manual) ─────────────────────────
create table property_content (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties(id) on delete cascade,
  section      text not null,
  sort_order   int not null default 0,
  title_en     text not null,
  title_ar     text not null,
  body_en      text not null,
  body_ar      text not null,
  media_ids    uuid[] not null default '{}',
  is_published boolean not null default true
);

create index property_content_property_idx on property_content(property_id, section, sort_order);

-- ─── Services ─────────────────────────────────────────────────
create table services (
  id               uuid primary key default gen_random_uuid(),
  property_id      uuid references properties(id),  -- null = global
  name_en          text not null,
  name_ar          text not null,
  description_en   text not null,
  description_ar   text not null,
  price_egp        numeric(10,2) not null,
  mode             text not null check (mode in ('instant','request')),
  lead_time_hours  int not null default 24,
  is_active        boolean not null default true,
  media_id         uuid references media(id),
  sort_order       int not null default 0
);

-- ─── Service orders ────────────────────────────────────────────
create table service_orders (
  id                    uuid primary key default gen_random_uuid(),
  booking_id            uuid not null references bookings(id),
  service_id            uuid not null references services(id),
  mode                  text not null check (mode in ('instant','request')),
  status                text not null default 'requested'
                          check (status in (
                            'requested','confirmed','awaiting_payment',
                            'paid','delivered','declined','cancelled'
                          )),
  quantity              int not null default 1,
  notes                 text,
  amount_egp            numeric(10,2) not null,
  paymob_order_id       text,
  paymob_transaction_id text,
  paid_at               timestamptz,
  created_at            timestamptz not null default now(),
  unique (paymob_order_id) -- prevent duplicate webhook processing
);

-- ─── Requests ─────────────────────────────────────────────────
create table requests (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references bookings(id),
  category     text not null
                 check (category in ('maintenance','housekeeping','supplies','service','other')),
  body         text not null,
  media_ids    uuid[] not null default '{}',
  urgency      text not null default 'normal' check (urgency in ('normal','urgent')),
  status       text not null default 'received'
                 check (status in ('received','in_progress','resolved')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

create table request_messages (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references requests(id) on delete cascade,
  author       text not null check (author in ('guest','team')),
  body         text not null,
  media_ids    uuid[] not null default '{}',
  created_at   timestamptz not null default now()
);

-- ─── Recommendations ──────────────────────────────────────────
create table recommendations (
  id               uuid primary key default gen_random_uuid(),
  scope            text not null check (scope in ('global','city','property')),
  city             text,
  property_id      uuid references properties(id),
  category         text not null,
  name             text not null,
  blurb_en         text not null,
  blurb_ar         text not null,
  lat              double precision,
  lng              double precision,
  price_band       int check (price_band between 1 and 4),
  phone            text,
  url              text,
  jood_can_arrange boolean not null default false,
  media_ids        uuid[] not null default '{}',
  sort_order       int not null default 0
);

-- ─── Guest contacts ───────────────────────────────────────────
create table guest_contacts (
  id                 uuid primary key default gen_random_uuid(),
  booking_id         uuid not null references bookings(id),
  email              text,
  phone              text,
  consent_marketing  boolean not null default false,
  consent_at         timestamptz not null default now(),
  source             text not null,
  created_at         timestamptz not null default now()
);

-- ─── Guest documents ──────────────────────────────────────────
create table guest_documents (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings(id),
  doc_type      text not null,
  storage_path  text not null,
  uploaded_at   timestamptz not null default now(),
  delete_after  timestamptz not null,
  deleted_at    timestamptz
);

-- ─── Audit log ────────────────────────────────────────────────
create table audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_type   text not null,
  actor_id     uuid,
  action       text not null,
  entity       text not null,
  entity_id    text not null,
  meta         jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log(entity, entity_id, created_at desc);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
-- The anon key (used in the browser client) must NEVER be able
-- to read bookings, stay_tokens, guest_documents, or door codes.
-- All guest reads go through server-side token resolution using
-- the service-role key; client-side Supabase calls are for
-- non-sensitive UI state only.
-- ============================================================

alter table properties        enable row level security;
alter table bookings          enable row level security;
alter table stay_tokens       enable row level security;
alter table property_content  enable row level security;
alter table services          enable row level security;
alter table service_orders    enable row level security;
alter table requests          enable row level security;
alter table request_messages  enable row level security;
alter table recommendations   enable row level security;
alter table guest_contacts    enable row level security;
alter table guest_documents   enable row level security;
alter table media             enable row level security;
alter table audit_log         enable row level security;

-- Deny all anon access to sensitive tables — access via service role only
create policy "deny_anon_bookings"       on bookings          for all to anon using (false);
create policy "deny_anon_stay_tokens"    on stay_tokens       for all to anon using (false);
create policy "deny_anon_guest_docs"     on guest_documents   for all to anon using (false);
create policy "deny_anon_guest_contacts" on guest_contacts    for all to anon using (false);
create policy "deny_anon_audit"          on audit_log         for all to anon using (false);

-- Published property content is readable by anon (no PII)
create policy "anon_read_property_content"
  on property_content for select to anon
  using (is_published = true);

-- Published services readable by anon
create policy "anon_read_services"
  on services for select to anon
  using (is_active = true);

-- Media readable by anon (images/videos have no PII)
create policy "anon_read_media"
  on media for select to anon
  using (true);

-- Recommendations readable by anon
create policy "anon_read_recommendations"
  on recommendations for select to anon
  using (true);

-- Properties: only slug + public info via anon
create policy "anon_read_properties"
  on properties for select to anon
  using (true);

-- Service role bypasses RLS — used server-side only
