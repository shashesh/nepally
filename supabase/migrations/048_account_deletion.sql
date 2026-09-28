-- 048_account_deletion.sql
-- ADDITIVE / non-destructive: one nullable column, one partial index, five
-- functions, a replaced guard-trigger function and eight SELECT policies
-- altered in place. No data changes.
--
-- In-app account deletion, first half (spec:
-- docs/specs/2026-09-28-account-deletion.md). A member asks to delete their
-- account; it is hidden from everyone else for 30 days and can be restored
-- by signing in. After 30 days the purge-deleted-accounts edge function
-- (added with migration 049) removes their storage objects and deletes the
-- auth user, and the existing ON DELETE CASCADE chain removes every row.
--
--   users.deletion_scheduled_for: NULL while the account is active; the
--   purge date while deletion is pending. No client role holds a column
--   grant on it (036), so only the owner sees it, through get_my_profile()
--   (SETOF users, SELECT u.*, so it picks the column up unchanged).
--   The 034 guard now treats it as privileged: only the functions below and
--   service_role can change it.
--
--   amr_signed_in_within(amr, max_age): true when the newest timestamp in a
--   Supabase JWT's amr claim is at most max_age seconds old. Refreshing a
--   token keeps amr unchanged (checked on staging 2026-09-28), so this is
--   the time of the last real sign-in. SECURITY INVOKER and pure; only
--   service_role (the smoke test) and the definer functions call it.
--
--   request_account_deletion(): the caller must have signed in within the
--   last 600 seconds (REAUTH_MAX_AGE_SECONDS in @nepally/shared), otherwise
--   it raises 'reauth_required' (SQLSTATE P0001), which the apps match on.
--   Sets the purge date 30 days out (ACCOUNT_DELETION_GRACE_DAYS), removes
--   the caller's device tokens so no push reaches a hidden account, and
--   returns the date. Repeating it returns the existing date.
--
--   cancel_account_deletion(): clears the date. No recency check: the
--   restore screen is only reachable by signing in.
--
--   is_pending_deletion(uid): policy helper. False for active and unknown
--   users, so it follows the 041 smoke test's convention for helpers.
--   Granted to anon and authenticated because the posts, comments, likes,
--   follows, events and RSVP policies apply to every role.
--
--   list_user_storage_objects(uid): every storage object the user owns,
--   whatever its path. service_role only; the purge uses it.
--
--   Policies: each SELECT policy below keeps its original condition and
--   adds "the row's user is not pending deletion, or the caller is that
--   user, or the caller is a moderator". user_follows hides an edge when
--   either end is pending (moderators still see it). Messages and
--   conversations are unchanged: chats keep their history and the apps show
--   the other person as an unavailable account.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
-- CREATE OR REPLACE, GRANT/REVOKE and ALTER POLICY can all be re-run.
--
-- Verify: npm run test:security:account-deletion and
-- npm run test:security:functions against staging.
--
-- Rollback (forward-only): a new migration that ALTERs the eight policies
-- back to their pre-048 conditions (each is quoted in the account-deletion
-- implementation plan, "Verified while planning"), restores the 034 guard
-- body, and drops the functions. The column can stay; NULL everywhere means
-- nothing is hidden.

-- ---------------------------------------------------------------------------
-- 1) Column and index
-- ---------------------------------------------------------------------------

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz;

COMMENT ON COLUMN public.users.deletion_scheduled_for IS
  'NULL = active. Otherwise the account is hidden and will be purged at this time (migration 048). Changed only by request_account_deletion() / cancel_account_deletion().';

CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled_for
  ON public.users (deletion_scheduled_for)
  WHERE deletion_scheduled_for IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) The 034 guard also protects deletion_scheduled_for
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_user_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.trust_level            := 0;
    NEW.is_moderator           := false;
    NEW.is_premium             := false;
    NEW.is_banned              := false;
    NEW.ban_reason             := NULL;
    NEW.email_verified         := false;
    NEW.google_verified        := false;
    NEW.phone_verified         := false;
    NEW.facebook_verified      := false;
    NEW.posts_count            := 0;
    NEW.helpful_votes_received := 0;
    NEW.reports_received       := 0;
    NEW.follower_count         := 0;
    NEW.following_count        := 0;
    NEW.deletion_scheduled_for := NULL;
    RETURN NEW;
  END IF;

  IF NEW.trust_level            IS DISTINCT FROM OLD.trust_level
     OR NEW.is_moderator           IS DISTINCT FROM OLD.is_moderator
     OR NEW.is_premium             IS DISTINCT FROM OLD.is_premium
     OR NEW.is_banned              IS DISTINCT FROM OLD.is_banned
     OR NEW.ban_reason             IS DISTINCT FROM OLD.ban_reason
     OR NEW.email_verified         IS DISTINCT FROM OLD.email_verified
     OR NEW.google_verified        IS DISTINCT FROM OLD.google_verified
     OR NEW.phone_verified         IS DISTINCT FROM OLD.phone_verified
     OR NEW.facebook_verified      IS DISTINCT FROM OLD.facebook_verified
     OR NEW.posts_count            IS DISTINCT FROM OLD.posts_count
     OR NEW.helpful_votes_received IS DISTINCT FROM OLD.helpful_votes_received
     OR NEW.reports_received       IS DISTINCT FROM OLD.reports_received
     OR NEW.follower_count         IS DISTINCT FROM OLD.follower_count
     OR NEW.following_count        IS DISTINCT FROM OLD.following_count
     OR NEW.deletion_scheduled_for IS DISTINCT FROM OLD.deletion_scheduled_for
  THEN
    RAISE EXCEPTION 'Privileged user columns cannot be modified directly'
      USING ERRCODE = '42501',
            HINT = 'Verification goes through mark_user_verified(); moderation flags require a moderator action; account deletion goes through request_account_deletion().';
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.amr_signed_in_within(p_amr jsonb, p_max_age_seconds integer)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN jsonb_typeof(p_amr) IS DISTINCT FROM 'array' THEN false
    ELSE COALESCE(
      (
        SELECT max((entry ->> 'timestamp')::numeric)
          FROM jsonb_array_elements(p_amr) AS entry
         WHERE jsonb_typeof(entry -> 'timestamp') = 'number'
      ) >= extract(epoch FROM now()) - p_max_age_seconds,
      false
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_pending_deletion(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.users u
     WHERE u.id = p_user_id
       AND u.deletion_scheduled_for IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_grace_period           CONSTANT interval := interval '30 days';
  c_reauth_max_age_seconds CONSTANT integer  := 600;
  v_user_id   uuid := auth.uid();
  v_scheduled timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.amr_signed_in_within(auth.jwt() -> 'amr', c_reauth_max_age_seconds) THEN
    RAISE EXCEPTION 'reauth_required' USING ERRCODE = 'P0001';
  END IF;

  SELECT u.deletion_scheduled_for
    INTO v_scheduled
    FROM public.users u
   WHERE u.id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_scheduled IS NOT NULL THEN
    RETURN v_scheduled;
  END IF;

  UPDATE public.users
     SET deletion_scheduled_for = now() + c_grace_period
   WHERE id = v_user_id
  RETURNING deletion_scheduled_for INTO v_scheduled;

  DELETE FROM public.device_tokens WHERE user_id = v_user_id;

  RETURN v_scheduled;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.users
     SET deletion_scheduled_for = NULL
   WHERE id = auth.uid()
     AND deletion_scheduled_for IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_user_storage_objects(p_user_id uuid)
RETURNS TABLE (bucket_id text, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT o.bucket_id, o.name
    FROM storage.objects o
   WHERE o.owner_id = p_user_id::text
   ORDER BY o.bucket_id, o.name;
$$;

-- Grants (041: new functions are executable by nobody until granted).
REVOKE EXECUTE ON FUNCTION public.amr_signed_in_within(jsonb, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.amr_signed_in_within(jsonb, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_pending_deletion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_pending_deletion(uuid) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.request_account_deletion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.cancel_account_deletion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.list_user_storage_objects(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_user_storage_objects(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Hide pending accounts from everyone but themselves and moderators
-- ---------------------------------------------------------------------------

ALTER POLICY "Users are viewable by everyone" ON public.users
  USING (
    deletion_scheduled_for IS NULL
    OR id = (SELECT auth.uid())
    OR (SELECT public.is_moderator())
  );

ALTER POLICY "Active posts are viewable by everyone" ON public.posts
  USING (
    (status = 'active'::post_status AND NOT public.is_pending_deletion(author_id))
    OR author_id = (SELECT auth.uid())
    OR (SELECT public.is_moderator())
  );

ALTER POLICY "Anyone can view non-deleted comments" ON public.post_comments
  USING (
    is_deleted = false
    AND (
      NOT public.is_pending_deletion(author_id)
      OR author_id = (SELECT auth.uid())
      OR (SELECT public.is_moderator())
    )
  );

ALTER POLICY "Anyone can read active listings" ON public.marketplace_listings
  USING (
    (
      status = 'active'::listing_status
      AND (NOT public.is_pending_deletion(owner_id) OR (SELECT public.is_moderator()))
    )
    OR owner_id = (SELECT auth.uid())
  );

ALTER POLICY events_select ON public.events
  USING (
    status <> 'removed'::event_status
    AND (
      NOT public.is_pending_deletion(organizer_id)
      OR organizer_id = (SELECT auth.uid())
      OR (SELECT public.is_moderator())
    )
  );

ALTER POLICY rsvps_select ON public.event_rsvps
  USING (
    EXISTS (
      SELECT 1
        FROM public.events
       WHERE events.id = event_rsvps.event_id
         AND events.status <> 'removed'::event_status
         AND (
           events.rsvp_visibility = 'public'
           OR events.organizer_id = (SELECT auth.uid())
           OR event_rsvps.user_id = (SELECT auth.uid())
         )
    )
    AND (
      NOT public.is_pending_deletion(user_id)
      OR user_id = (SELECT auth.uid())
      OR (SELECT public.is_moderator())
    )
  );

ALTER POLICY "Anyone can view likes" ON public.post_likes
  USING (
    NOT public.is_pending_deletion(user_id)
    OR user_id = (SELECT auth.uid())
    OR (SELECT public.is_moderator())
  );

ALTER POLICY user_follows_select_all ON public.user_follows
  USING (
    (NOT public.is_pending_deletion(follower_id) AND NOT public.is_pending_deletion(followee_id))
    OR (SELECT public.is_moderator())
  );
