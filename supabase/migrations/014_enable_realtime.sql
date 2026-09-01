-- Enable Supabase Realtime on guest_requests so guests receive
-- instant status updates without polling.
-- Run this once in the Supabase SQL editor or as a migration.
ALTER PUBLICATION supabase_realtime ADD TABLE guest_requests;
