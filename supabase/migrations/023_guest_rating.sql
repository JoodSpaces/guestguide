-- Guest mood rating on fulfilled service requests (1=unhappy, 2=neutral, 3=happy)
alter table service_requests
  add column if not exists guest_rating smallint check (guest_rating between 1 and 3);
