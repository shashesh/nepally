-- 047_report_auto_hide_threshold.sql
-- ADDITIVE / non-destructive: one new column, two new trigger functions,
-- three new triggers, and a replaced on_report_created(). No data changes.
-- Content now hides at 100 reports instead of 3, listings are counted and
-- hidden like posts, and nobody but a moderator or the database itself can
-- undo a hidden listing or reset a report counter.
--
--   Decision (2026-09-27): three reports let a handful of members hide any
--   post. Posts and listings must reach at least 100 reports before they
--   are hidden. A post still goes to 'pending' (the moderation queue's
--   Pending posts section). A listing becomes 'removed'.
--
--   Listing reports: report_target_type has had 'listing' since 014, and
--   the apps now file listing reports, but on_report_created() (035)
--   handled posts and users only. A listing report now bumps the new
--   marketplace_listings.reports_count and the owner's
--   users.reports_received, like a post report does for its author.
--
--   Listing status guard: the owner UPDATE policy (014, 033) allows every
--   column, so an owner could set a moderator-removed listing back to
--   'active' over REST, and an auto-removed one would be no different.
--   guard_listing_status_transition() blocks any move out of 'removed' by a
--   client that is not a moderator. Owners keep everything the apps do:
--   active <-> inactive, and delete, which already sets 'removed' and which
--   the apps describe as permanent. Moderators cannot update other members'
--   listings under RLS today, so restoring one goes through the dashboard
--   (service_role) until the moderation queue gets a listing action.
--
--   Report counter guard: posts' and listings' reports_count were writable
--   by their author/owner, who could reset it to stay under the threshold,
--   or create the row with a forged count (a large negative one would keep
--   it under 100 for good). guard_report_counts() lets only privileged
--   contexts (on_report_created runs as its owner) and moderators change it,
--   and starts every client-inserted row at 0.
--
--   Privileged contexts: the guards follow 035's
--   guard_post_status_transition(). SECURITY INVOKER, and any current_user
--   other than anon/authenticated (service_role, postgres, a SECURITY
--   DEFINER function such as on_report_created) passes.
--
--   Grants: trigger functions need no EXECUTE for client roles (ADR
--   2026-09-25). 041's default privileges already withhold it; the explicit
--   REVOKEs keep that true on a database set up any other way.
--   CREATE OR REPLACE keeps on_report_created()'s existing privileges.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE, and
-- DROP TRIGGER IF EXISTS before each CREATE TRIGGER.
--
-- Live checks: npm run test:security:emergency-post (posts),
-- npm run test:security:listing-reports (listings),
-- npm run test:security:functions (grants).

-- ---------------------------------------------------------------------------
-- 1) Listing report counter
-- ---------------------------------------------------------------------------

ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS reports_count integer NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 2) Report trigger: threshold 100, listings counted and removed
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.on_report_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Reports needed before content is hidden for moderation (3 until 047).
  c_auto_hide_threshold CONSTANT integer := 100;
  v_owner          uuid;
  v_count          integer;
  v_post_status    public.post_status;
  v_listing_status public.listing_status;
BEGIN
  IF NEW.target_type = 'post' THEN
    UPDATE public.posts
       SET reports_count = reports_count + 1
     WHERE id = NEW.target_id
     RETURNING author_id, reports_count, status INTO v_owner, v_count, v_post_status;

    IF FOUND THEN
      IF v_post_status = 'active' AND v_count >= c_auto_hide_threshold THEN
        UPDATE public.posts
           SET status = 'pending', updated_at = now()
         WHERE id = NEW.target_id;
      END IF;

      UPDATE public.users
         SET reports_received = reports_received + 1
       WHERE id = v_owner;
    END IF;
  ELSIF NEW.target_type = 'listing' THEN
    UPDATE public.marketplace_listings
       SET reports_count = reports_count + 1
     WHERE id = NEW.target_id
     RETURNING owner_id, reports_count, status INTO v_owner, v_count, v_listing_status;

    IF FOUND THEN
      -- 'inactive' too, so deactivating a listing cannot dodge the threshold.
      IF v_listing_status IN ('active', 'inactive') AND v_count >= c_auto_hide_threshold THEN
        UPDATE public.marketplace_listings
           SET status = 'removed'
         WHERE id = NEW.target_id;
      END IF;

      UPDATE public.users
         SET reports_received = reports_received + 1
       WHERE id = v_owner;
    END IF;
  ELSIF NEW.target_type = 'user' THEN
    UPDATE public.users
       SET reports_received = reports_received + 1
     WHERE id = NEW.target_id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.on_report_created() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) A removed listing stays removed unless a moderator restores it
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_listing_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Privileged contexts: service_role, postgres, SECURITY DEFINER helpers.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF public.is_moderator() THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'removed' THEN
    RAISE EXCEPTION 'A removed listing can only be restored by a moderator'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_listing_status_transition() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_listing_status_transition ON public.marketplace_listings;
CREATE TRIGGER trg_guard_listing_status_transition
  BEFORE UPDATE OF status ON public.marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_listing_status_transition();

-- ---------------------------------------------------------------------------
-- 4) Report counters change only through the report trigger or a moderator,
--    and a client-created row starts at 0
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_report_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.reports_count IS NOT DISTINCT FROM OLD.reports_count THEN
    RETURN NEW;
  END IF;

  -- Privileged contexts: service_role, postgres, and on_report_created().
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF public.is_moderator() THEN
    RETURN NEW;
  END IF;

  -- A new post or listing has no reports, whatever count the client sent.
  -- Normalised rather than rejected: the apps never send one.
  IF TG_OP = 'INSERT' THEN
    NEW.reports_count := 0;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'reports_count can only be changed by the report trigger'
    USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.guard_report_counts() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_post_reports_count ON public.posts;
CREATE TRIGGER trg_guard_post_reports_count
  BEFORE INSERT OR UPDATE OF reports_count ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_report_counts();

DROP TRIGGER IF EXISTS trg_guard_listing_reports_count ON public.marketplace_listings;
CREATE TRIGGER trg_guard_listing_reports_count
  BEFORE INSERT OR UPDATE OF reports_count ON public.marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_report_counts();
