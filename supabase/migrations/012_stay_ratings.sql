CREATE TABLE stay_ratings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  stars       int         NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX stay_ratings_booking_idx ON stay_ratings (booking_id);

ALTER TABLE stay_ratings ENABLE ROW LEVEL SECURITY;
-- Only service role writes; no guest-facing select needed
