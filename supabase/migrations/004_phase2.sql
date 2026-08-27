-- ─── Phase 2: Services Catalogue + Guest Requests ──────────────────────────

-- Global services catalogue (admin-managed)
CREATE TABLE IF NOT EXISTS services (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category        text NOT NULL DEFAULT 'other'
                    CHECK (category IN ('early_checkin','late_checkout','transfer','housekeeping','amenities','food','other')),
  name_en         text NOT NULL,
  name_ar         text NOT NULL DEFAULT '',
  description_en  text,
  description_ar  text,
  price_egp       int NOT NULL DEFAULT 0,
  lead_hours      int NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Guest service request (ties to a service in the catalogue)
CREATE TABLE IF NOT EXISTS service_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  service_id          uuid REFERENCES services(id) ON DELETE SET NULL,
  quantity            int NOT NULL DEFAULT 1,
  guest_notes         text,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','paid','fulfilled','rejected')),
  admin_notes         text,
  paymob_order_id     text,
  paymob_payment_url  text,
  paid_at             timestamptz,
  fulfilled_at        timestamptz,
  rejected_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Free-text guest requests (maintenance, housekeeping, other messages)
CREATE TABLE IF NOT EXISTS guest_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  category    text NOT NULL DEFAULT 'other'
                CHECK (category IN ('maintenance','housekeeping','supplies','service','other')),
  body        text NOT NULL,
  urgency     text NOT NULL DEFAULT 'normal'
                CHECK (urgency IN ('normal','urgent')),
  status      text NOT NULL DEFAULT 'received'
                CHECK (status IN ('received','in_progress','resolved')),
  admin_notes text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS service_requests_booking_id ON service_requests(booking_id);
CREATE INDEX IF NOT EXISTS service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS service_requests_created_at ON service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS guest_requests_booking_id ON guest_requests(booking_id);
CREATE INDEX IF NOT EXISTS guest_requests_status ON guest_requests(status);
CREATE INDEX IF NOT EXISTS guest_requests_created_at ON guest_requests(created_at DESC);
