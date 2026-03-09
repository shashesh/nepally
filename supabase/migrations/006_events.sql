-- =============================================================================
-- Migration 006: Events + Event RSVPs
-- Non-destructive, additive only.
-- DO NOT modify migrations 001, 002, or 003.
-- =============================================================================

-- Event type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'event_type'
  ) THEN
    CREATE TYPE event_type AS ENUM ('cultural', 'religious', 'social', 'career', 'other');
  END IF;
END $$;

-- Event status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'event_status'
  ) THEN
    CREATE TYPE event_status AS ENUM ('active', 'cancelled', 'removed');
  END IF;
END $$;

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 150),
  description      TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 3000),
  event_type       event_type NOT NULL,
  start_date       TIMESTAMPTZ NOT NULL,
  end_date         TIMESTAMPTZ CHECK (end_date IS NULL OR end_date > start_date),
  location_name    TEXT NOT NULL CHECK (char_length(location_name) BETWEEN 5 AND 100),
  location_address TEXT CHECK (char_length(location_address) <= 200),
  metro_area_id    TEXT NOT NULL REFERENCES metro_areas(id),
  is_global        BOOLEAN NOT NULL DEFAULT FALSE,
  organizer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url        TEXT,
  rsvp_count       INTEGER NOT NULL DEFAULT 0,
  rsvp_visibility  TEXT NOT NULL DEFAULT 'public' CHECK (rsvp_visibility IN ('public', 'private')),
  status           event_status NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Event RSVPs junction table
CREATE TABLE IF NOT EXISTS event_rsvps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

-- Indexes for feed queries
CREATE INDEX IF NOT EXISTS idx_events_metro_start  ON events (metro_area_id, start_date) WHERE status != 'removed';
CREATE INDEX IF NOT EXISTS idx_events_global_start ON events (start_date) WHERE is_global = TRUE AND status != 'removed';
CREATE INDEX IF NOT EXISTS idx_events_organizer    ON events (organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event   ON event_rsvps (event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user    ON event_rsvps (user_id);

-- Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- Events: anyone can read active/cancelled events (removed = gone from feeds)
DROP POLICY IF EXISTS "events_select" ON events;
CREATE POLICY "events_select" ON events
  FOR SELECT USING (status != 'removed');

-- Events: Level 1+ users can create events
DROP POLICY IF EXISTS "events_insert" ON events;
CREATE POLICY "events_insert" ON events
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND organizer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND trust_level >= 1
    )
  );

-- Events: organizer can update their own events
DROP POLICY IF EXISTS "events_update" ON events;
CREATE POLICY "events_update" ON events
  FOR UPDATE USING (
    organizer_id = auth.uid()
    AND status != 'removed'
  )
  WITH CHECK (organizer_id = auth.uid());

-- Events: organizer can delete their own events (hard delete — we use status='removed' for soft delete)
DROP POLICY IF EXISTS "events_delete" ON events;
CREATE POLICY "events_delete" ON events
  FOR DELETE USING (organizer_id = auth.uid());

-- RSVPs: privacy visibility is enforced by RLS (public events, organizer, or RSVP owner); UI filtering is additive only
DROP POLICY IF EXISTS "rsvps_select" ON event_rsvps;
CREATE POLICY "rsvps_select" ON event_rsvps
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM events
      WHERE events.id = event_rsvps.event_id
        AND events.status != 'removed'
        AND (
          events.rsvp_visibility = 'public'
          OR events.organizer_id = auth.uid()
          OR event_rsvps.user_id = auth.uid()
        )
    )
  );

-- RSVPs: Level 1+ users can insert their own RSVPs for active events only
DROP POLICY IF EXISTS "rsvps_insert" ON event_rsvps;
CREATE POLICY "rsvps_insert" ON event_rsvps
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND trust_level >= 1
    )
    AND EXISTS (
      SELECT 1
      FROM events
      WHERE events.id = event_rsvps.event_id
        AND events.status = 'active'
    )
  );

-- RSVPs: users can delete their own RSVPs
DROP POLICY IF EXISTS "rsvps_delete" ON event_rsvps;
CREATE POLICY "rsvps_delete" ON event_rsvps
  FOR DELETE USING (user_id = auth.uid());

-- Trigger: increment rsvp_count on new RSVP
CREATE OR REPLACE FUNCTION increment_event_rsvp_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.events
  SET rsvp_count = rsvp_count + 1
  WHERE id = NEW.event_id;

  RETURN NEW;
END;
$$;

-- Trigger: decrement rsvp_count on RSVP removal (floor at 0)
CREATE OR REPLACE FUNCTION decrement_event_rsvp_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.events
  SET rsvp_count = GREATEST(rsvp_count - 1, 0)
  WHERE id = OLD.event_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_rsvp_insert ON event_rsvps;
CREATE TRIGGER trg_rsvp_insert
  AFTER INSERT ON event_rsvps
  FOR EACH ROW EXECUTE FUNCTION increment_event_rsvp_count();

DROP TRIGGER IF EXISTS trg_rsvp_delete ON event_rsvps;
CREATE TRIGGER trg_rsvp_delete
  AFTER DELETE ON event_rsvps
  FOR EACH ROW EXECUTE FUNCTION decrement_event_rsvp_count();

-- Trigger: keep updated_at current on events
CREATE OR REPLACE FUNCTION set_event_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_updated_at ON events;
CREATE TRIGGER trg_event_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_event_updated_at();

-- =============================================================================
-- Event Photos Storage Bucket
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view event photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own event photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own event photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own event photos" ON storage.objects;

CREATE POLICY "Anyone can view event photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-photos');

CREATE POLICY "Users can upload own event photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own event photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'event-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own event photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- Soft Delete Event RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.soft_delete_event(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.events
  SET status = 'removed'
  WHERE id = p_event_id
    AND organizer_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not allowed or event not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_event(uuid) TO authenticated;

-- Keep rsvp_count aligned with actual RSVP rows.
UPDATE public.events e
SET rsvp_count = totals.total
FROM (
  SELECT ev.id, COUNT(er.id)::integer AS total
  FROM public.events ev
  LEFT JOIN public.event_rsvps er ON er.event_id = ev.id
  GROUP BY ev.id
) AS totals
WHERE e.id = totals.id
  AND e.rsvp_count <> totals.total;
