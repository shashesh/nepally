-- 042_dedupe_listing_counters.sql
-- ADDITIVE / non-destructive: two new tables, two functions replaced with the
-- same signatures. No existing data changes.
-- Counts each member at most once in a listing's views and contacts, so the
-- counters, and the trending score built from them, can't be inflated.
--
--   Problem: increment_listing_views and increment_listing_contacts (017)
--   add 1 on every call. The apps call them each time a detail page opens
--   and each time someone taps "Message seller", and any signed-in member
--   can call them directly as often as they like. views_count and
--   contacts_count feed trending_score (018: views + saves * 3 +
--   contacts * 5), so a seller could push their own listing up the
--   Trending strip, or bury a rival's promotion analytics under noise.
--   041 already stopped anon from calling them.
--
--   Fix: each function records who counted in a table of its own and adds 1
--   only when that record is new.
--     - Views: one per member, per listing, per UTC day. listing_views keeps
--       one row per member and listing, holding the last day that member
--       counted, so the table grows with members x listings viewed, not
--       with days.
--     - Contacts: one per member, per listing, ever (listing_contacts).
--     - The listing's owner never counts on their own listing.
--     - A call without a signed-in member (auth.uid() is null) does nothing,
--       and so does a call from an account with no public.users row yet
--       (mid-onboarding): the new tables reference users, and a quiet
--       no-op beats a foreign-key error the apps would swallow anyway.
--   The functions keep their signatures and 041's grants (authenticated +
--   service_role). CREATE OR REPLACE keeps a function's ACL, so 041 must run
--   first; on a database without it they would keep 017's looser ACL. Both
--   apps call them exactly as before.
--
--   The tables are internal. RLS is on with no policies, and anon and
--   authenticated have no privileges on them, so they are not readable
--   through the API. Only the SECURITY DEFINER functions and service_role
--   touch them. A listing's deletion cascades to its rows, and so does a
--   member's.
--
--   Existing totals stay as they are. Past repeat calls can't be told apart
--   from real views, so there is nothing to recount from.
--
-- Not idempotent: re-running fails at CREATE TABLE ("already exists") and
-- changes nothing.
--
-- Verify: npm run test:security:listing-counters against staging.
--
-- Rollback (forward-only): a new migration that restores 017's function
-- bodies, then DROP TABLE listing_views, listing_contacts.

CREATE TABLE public.listing_views (
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings (id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  last_counted_on date NOT NULL,
  PRIMARY KEY (listing_id, viewer_id)
);

CREATE TABLE public.listing_contacts (
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings (id) ON DELETE CASCADE,
  contacter_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, contacter_id)
);

-- Deleting a member cascades through these, so index the member side.
CREATE INDEX idx_listing_views_viewer ON public.listing_views (viewer_id);
CREATE INDEX idx_listing_contacts_contacter ON public.listing_contacts (contacter_id);

ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_contacts ENABLE ROW LEVEL SECURITY;

-- Supabase's default privileges grant every new table to anon and
-- authenticated. These are for the counter functions only.
REVOKE ALL ON public.listing_views FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.listing_contacts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.listing_views TO service_role;
GRANT ALL ON public.listing_contacts TO service_role;

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

  -- Inserts a first view, or moves an earlier day's view to today. Both
  -- count. A second view on the same day matches the WHERE on the conflict
  -- branch to nothing, so FOUND stays false.
  INSERT INTO public.listing_views (listing_id, viewer_id, last_counted_on)
  SELECT l.id, v_viewer, v_today
    FROM public.marketplace_listings l
   WHERE l.id = p_listing_id
     AND l.status = 'active'
     AND l.owner_id <> v_viewer
     AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = v_viewer)
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

  INSERT INTO public.listing_contacts (listing_id, contacter_id)
  SELECT l.id, v_contacter
    FROM public.marketplace_listings l
   WHERE l.id = p_listing_id
     AND l.status = 'active'
     AND l.owner_id <> v_contacter
     AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = v_contacter)
  ON CONFLICT (listing_id, contacter_id) DO NOTHING;

  IF FOUND THEN
    UPDATE public.marketplace_listings
       SET contacts_count = contacts_count + 1
     WHERE id = p_listing_id;
  END IF;
END;
$$;
