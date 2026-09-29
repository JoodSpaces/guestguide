-- ============================================================
-- Migration 028: one stay per (source, external_ref)
-- ============================================================
-- The website bridge creates a stay keyed by the website's booking reference
-- (source 'direct', external_ref 'JOOD-XXXXXX') and is retried freely. The
-- bridge already checks "does it exist?" first; this index makes that safe under
-- concurrent retries (the loser gets 23505 and re-reads), and stops an OTA import
-- or a double-click from creating the same external booking twice.
--
-- NOT APPLIED. Check for existing duplicates first — this fails if there are any:
--   select source, external_ref, count(*) from bookings
--    where external_ref is not null group by 1,2 having count(*) > 1;
--
-- Follow-up worth doing (audit GA-17): forbid overlapping confirmed stays in the
-- database, not only in application code. Needs btree_gist and clean data first:
--   create extension if not exists btree_gist;
--   alter table bookings add constraint bookings_no_overlap
--     exclude using gist (property_id with =, tstzrange(check_in, check_out) with &&)
--     where (status <> 'cancelled');
-- ============================================================
create unique index if not exists bookings_source_external_ref_key
  on bookings (source, external_ref)
  where external_ref is not null;
