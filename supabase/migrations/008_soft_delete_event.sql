-- =============================================================================
-- Migration 008: Soft Delete Event RPC + RSVP Count Sync
-- Non-destructive, additive only.
-- DO NOT modify migrations 001, 002, or 003.
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
