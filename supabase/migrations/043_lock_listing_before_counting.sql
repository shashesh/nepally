-- 043_lock_listing_before_counting.sql
-- ADDITIVE / non-destructive: two functions replaced with the same
-- signatures. No schema or data changes.
-- Makes increment_listing_views and increment_listing_contacts (042) lock
-- the listing before they record who counted.
--
--   Problem: 042 checks the listing is active inside the INSERT of the
--   per-member marker, then bumps the counter in a separate UPDATE. Under
--   READ COMMITTED each statement sees fresh data, so:
--     - A listing that goes inactive between the two statements still gets
--       +1. 017 guarded the UPDATE itself with status = 'active'; 042 lost
--       that.
--     - A repeat view on a later day locks the member's listing_views row,
--       then waits for the listing row in the UPDATE. Deleting the listing
--       (today only through a cascade, such as deleting the owner's
--       account) locks the listing first, then waits for that same
--       listing_views row in its cascade. Opposite lock order: Postgres
--       aborts one of the two with a deadlock error.
--
--   Fix: each function first locks the listing row with FOR NO KEY UPDATE,
--   the lock its UPDATE takes anyway, and returns if the listing is not
--   active or is the caller's own. While that lock is held, the status
--   can't change and the listing can't be deleted, so the marker and the
--   counter move together, and every path takes the listing lock before
--   the child row, as a cascading delete does. If the listing changes while
--   the function waits for the lock, Postgres re-checks the WHERE against
--   the new row, so an inactive listing is skipped and no marker is written.
--
--   Everything else is as in 042: one view per member, per listing, per UTC
--   day; one contact per member, per listing, ever; the owner and callers
--   with no public.users row count nothing. CREATE OR REPLACE keeps 041's
--   grants (authenticated + service_role).
--
-- Idempotent: CREATE OR REPLACE can be re-run.
--
-- Verify: npm run test:security:listing-counters against staging.
--
-- Rollback (forward-only): a new migration that restores 042's function
-- bodies.

CREATE OR REPLACE FUNCTION public.increment_listing_views(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_viewer uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'utc')::date;
BEGIN
  IF v_viewer IS NULL THEN
    RETURN;
  END IF;

  PERFORM 1
     FROM public.marketplace_listings l
    WHERE l.id = p_listing_id
      AND l.status = 'active'
      AND l.owner_id <> v_viewer
      FOR NO KEY UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Inserts a first view, or moves an earlier day's view to today. Both
  -- count. A second view on the same day matches the WHERE on the conflict
  -- branch to nothing, so FOUND stays false.
  INSERT INTO public.listing_views (listing_id, viewer_id, last_counted_on)
  SELECT p_listing_id, v_viewer, v_today
   WHERE EXISTS (SELECT 1 FROM public.users u WHERE u.id = v_viewer)
  ON CONFLICT (listing_id, viewer_id) DO UPDATE
     SET last_counted_on = EXCLUDED.last_counted_on
   WHERE public.listing_views.last_counted_on < EXCLUDED.last_counted_on;

  IF FOUND THEN
    UPDATE public.marketplace_listings
       SET views_count = views_count + 1
     WHERE id = p_listing_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_listing_contacts(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_contacter uuid := auth.uid();
BEGIN
  IF v_contacter IS NULL THEN
    RETURN;
  END IF;

  PERFORM 1
     FROM public.marketplace_listings l
    WHERE l.id = p_listing_id
      AND l.status = 'active'
      AND l.owner_id <> v_contacter
      FOR NO KEY UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.listing_contacts (listing_id, contacter_id)
  SELECT p_listing_id, v_contacter
   WHERE EXISTS (SELECT 1 FROM public.users u WHERE u.id = v_contacter)
  ON CONFLICT (listing_id, contacter_id) DO NOTHING;

  IF FOUND THEN
    UPDATE public.marketplace_listings
       SET contacts_count = contacts_count + 1
     WHERE id = p_listing_id;
  END IF;
END;
$$;
