-- =============================================================================
-- Migration 019: Event "Interested" status
-- Adds status column to event_rsvps ('going' | 'interested')
-- Adds interested_count to events
-- Updates triggers to track each count separately
-- Non-destructive, additive only.
-- =============================================================================

-- Add status column to event_rsvps (default 'going' keeps all existing rows as going)
ALTER TABLE event_rsvps
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'going'
    CHECK (status IN ('going', 'interested'));

-- Add interested_count to events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS interested_count INTEGER NOT NULL DEFAULT 0;

-- Update insert trigger: route increment to the correct counter
CREATE OR REPLACE FUNCTION increment_event_rsvp_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'going' THEN
    UPDATE public.events SET rsvp_count = rsvp_count + 1 WHERE id = NEW.event_id;
  ELSIF NEW.status = 'interested' THEN
    UPDATE public.events SET interested_count = interested_count + 1 WHERE id = NEW.event_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Update delete trigger: route decrement to the correct counter
CREATE OR REPLACE FUNCTION decrement_event_rsvp_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'going' THEN
    UPDATE public.events SET rsvp_count = GREATEST(rsvp_count - 1, 0) WHERE id = OLD.event_id;
  ELSIF OLD.status = 'interested' THEN
    UPDATE public.events SET interested_count = GREATEST(interested_count - 1, 0) WHERE id = OLD.event_id;
  END IF;
  RETURN OLD;
END;
$$;

-- New update trigger: handle status changes (e.g. going → interested)
CREATE OR REPLACE FUNCTION update_event_rsvp_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Decrement old status counter
  IF OLD.status = 'going' THEN
    UPDATE public.events SET rsvp_count = GREATEST(rsvp_count - 1, 0) WHERE id = OLD.event_id;
  ELSIF OLD.status = 'interested' THEN
    UPDATE public.events SET interested_count = GREATEST(interested_count - 1, 0) WHERE id = OLD.event_id;
  END IF;

  -- Increment new status counter
  IF NEW.status = 'going' THEN
    UPDATE public.events SET rsvp_count = rsvp_count + 1 WHERE id = NEW.event_id;
  ELSIF NEW.status = 'interested' THEN
    UPDATE public.events SET interested_count = interested_count + 1 WHERE id = NEW.event_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rsvp_update ON event_rsvps;
CREATE TRIGGER trg_rsvp_update
  AFTER UPDATE ON event_rsvps
  FOR EACH ROW EXECUTE FUNCTION update_event_rsvp_count();

-- Recalculate counts to align with actual rows (idempotent reconcile)
UPDATE public.events e
SET
  rsvp_count = COALESCE(counts.going_total, 0),
  interested_count = COALESCE(counts.interested_total, 0)
FROM (
  SELECT
    ev.id,
    COUNT(er.id) FILTER (WHERE er.status = 'going')::integer AS going_total,
    COUNT(er.id) FILTER (WHERE er.status = 'interested')::integer AS interested_total
  FROM public.events ev
  LEFT JOIN public.event_rsvps er ON er.event_id = ev.id
  GROUP BY ev.id
) AS counts
WHERE e.id = counts.id;

-- RLS: allow users to UPDATE their own RSVP rows (status change)
DROP POLICY IF EXISTS "rsvps_update" ON event_rsvps;
CREATE POLICY "rsvps_update" ON event_rsvps
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
