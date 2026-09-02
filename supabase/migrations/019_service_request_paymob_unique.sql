-- Prevent duplicate Paymob order IDs on service_requests.
-- PostgreSQL UNIQUE constraints allow multiple NULLs, so unpaid requests are unaffected.
alter table service_requests
  add constraint uq_service_request_paymob unique (paymob_order_id);
