-- Drop schema tables that are defined in migrations but never queried by the application.
-- These are superseded by guest_requests, service_requests, and inventory_transactions.
-- Note: `media` is retained because services.media_id references it.

drop table if exists request_messages cascade;
drop table if exists requests         cascade;
drop table if exists service_orders   cascade;
drop table if exists guest_contacts   cascade;
drop table if exists guest_documents  cascade;
drop table if exists inventory_logs   cascade;
