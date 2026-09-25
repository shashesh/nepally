-- 044_lock_member_before_listing.sql
-- ADDITIVE / non-destructive: two functions replaced with the same
-- signatures. No schema or data changes.
-- Makes increment_listing_views and increment_listing_contacts (043) lock
-- the caller's users row before the listing.
--
--   Problem: 043 locks the listing, then inserts the per-member marker,
--   whose foreign key to users takes FOR KEY SHARE on the caller's users
--   row. Deleting that member's account locks the users row first, then
--   cascades. If the member had saved the listing, the cascade deletes the
--   saved_listings row, and its trigger (decrement_listing_saves) updates
--   the listing. So the delete holds the users row and waits for the
--   listing, while the counter holds the listing and waits for the users
--   row: Postgres aborts one of the two with a deadlock error.
--
--   Fix: each function first takes FOR KEY SHARE on the caller's users row,
--   then locks the listing as in 043. Every path now goes users row, then
--   listing, then marker row, the same order as the account delete.
--   FOR KEY SHARE conflicts only with a delete or a key change, so profile
--   edits and the follower-count triggers, which update the users row
--   without touching its key, don't wait on it. The users lookup also
--   replaces 043's EXISTS check: a caller with no users row yet
--   (mid-onboarding) still returns early and counts nothing.
--
--   Everything else is as in 043. CREATE OR REPLACE keeps 041's grants
--   (authenticated + service_role).
--
-- Idempotent: CREATE OR REPLACE can be re-run.
--
-- Verify: npm run test:security:listing-counters against staging.
--
-- Rollback (forward-only): a new migration that restores 043's function
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

  PERFORM 1 FROM public.users u WHERE u.id = v_viewer FOR KEY SHARE;
  IF NOT FOUND THEN
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
  VALUES (p_listing_id, v_viewer, v_today)
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

  PERFORM 1 FROM public.users u WHERE u.id = v_contacter FOR KEY SHARE;
  IF NOT FOUND THEN
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
  VALUES (p_listing_id, v_contacter)
  ON CONFLICT (listing_id, contacter_id) DO NOTHING;

  IF FOUND THEN
    UPDATE public.marketplace_listings
       SET contacts_count = contacts_count + 1
     WHERE id = p_listing_id;
  END IF;
END;
$$;
