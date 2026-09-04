-- 034_guard_user_privileged_columns.sql
-- ADDITIVE / non-destructive. Closes a privilege-escalation hole on public.users
-- and fixes a latent search_path bug in the premium-perk trigger functions.
--
--   1. SECURITY (CRITICAL) self-service privilege escalation:
--      The "Users can update own profile" UPDATE policy (001) only checks
--      auth.uid() = id and has no WITH CHECK / column restriction, and the
--      INSERT policy only checks the id. Nothing else guarded the row, so any
--      signed-in user could PATCH their own row with
--        { is_moderator: true, is_premium: true, trust_level: 2, ... }
--      via PostgREST. is_moderator grants delete-any-user, update/delete any
--      post, and read/update of the reports queue; is_premium grants global
--      posting and free listing promotions. Confirmed live on 2026-09-04.
--
--      Fix: a BEFORE INSERT OR UPDATE trigger that
--        - lets privileged contexts through unchanged (anything that is not the
--          PostgREST end-user roles `anon` / `authenticated`: the service_role
--          key, dashboard sessions, and SECURITY DEFINER helpers owned by
--          postgres — e.g. the follow-count triggers and mark_user_verified()),
--        - on INSERT from a client, forces every privileged column to its
--          default (a user may create their own profile, never an elevated one),
--        - on UPDATE from a client, raises if any privileged column changed.
--
--      Trust-level promotion moves server-side into mark_user_verified(), a
--      SECURITY DEFINER RPC that reads auth.users for the caller and promotes
--      to trust_level 1 only when the email is confirmed or a Google identity
--      is linked. The shared markEmailVerified/markGoogleVerified helpers now
--      call this RPC instead of writing trust_level from the client.
--
--   2. BUG: cascade_premium_perk_promotions() and
--      create_premium_perk_on_listing_insert() (from 023) were created with
--      SET search_path = '' but reference listing_promotions /
--      marketplace_listings / users unqualified, so they fail with
--      `relation "listing_promotions" does not exist` — i.e. every is_premium
--      flip (Stripe webhook, admin grant) errors out. Pin search_path = public
--      like 027 did for the other trigger functions.
--
-- Uses CREATE OR REPLACE / ALTER FUNCTION so re-running is harmless.
--
-- Not in scope (follow-ups):
--   - Moderator actions on OTHER users' rows (ban/unban, trust-level 2 grants)
--     still need dedicated SECURITY DEFINER RPCs; the own-row UPDATE policy is
--     unchanged and moderators cannot edit other users through the REST API.
--   - The advisor warnings about trigger functions being EXECUTE-able by
--     anon/authenticated are a separate cleanup.

-- ---------------------------------------------------------------------------
-- 1) Guard trigger on public.users
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_user_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Privileged contexts pass through untouched. Direct client writes arrive
  -- as `anon` / `authenticated`; everything else (service_role, postgres,
  -- SECURITY DEFINER helpers owned by postgres) is trusted.
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
    RETURN NEW;
  END IF;

  -- UPDATE from a client: any change to a privileged column is rejected.
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
  THEN
    RAISE EXCEPTION 'Privileged user columns cannot be modified directly'
      USING ERRCODE = '42501',
            HINT = 'Verification goes through mark_user_verified(); moderation flags require a moderator action.';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger functions must not be callable as RPCs.
REVOKE ALL ON FUNCTION public.guard_user_privileged_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_user_privileged_columns ON public.users;
CREATE TRIGGER trg_guard_user_privileged_columns
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_user_privileged_columns();

COMMENT ON FUNCTION public.guard_user_privileged_columns() IS
  'Blocks client-side writes to trust/moderation/premium/counter columns on users. Privileged roles and SECURITY DEFINER helpers pass through.';

-- ---------------------------------------------------------------------------
-- 2) Server-side verification promotion
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_user_verified()
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid             uuid := auth.uid();
  v_email_confirmed boolean;
  v_google_linked   boolean;
  v_row             public.users;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT (au.email_confirmed_at IS NOT NULL),
         EXISTS (
           SELECT 1 FROM auth.identities i
           WHERE i.user_id = au.id AND i.provider = 'google'
         )
    INTO v_email_confirmed, v_google_linked
  FROM auth.users au
  WHERE au.id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auth user not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.users u
     SET email_verified  = u.email_verified OR v_email_confirmed,
         google_verified = COALESCE(u.google_verified, false) OR v_google_linked,
         trust_level     = CASE
                             WHEN (v_email_confirmed OR v_google_linked) AND u.trust_level < 1 THEN 1
                             ELSE u.trust_level
                           END,
         updated_at      = now()
   WHERE u.id = v_uid
   RETURNING u.* INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', v_uid USING ERRCODE = 'P0002';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_user_verified() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_user_verified() TO authenticated;

COMMENT ON FUNCTION public.mark_user_verified() IS
  'Promotes the calling user to trust_level 1 when auth.users shows a confirmed email or a linked Google identity. Never demotes.';

-- ---------------------------------------------------------------------------
-- 3) Fix empty search_path on the premium-perk trigger functions (from 023)
-- ---------------------------------------------------------------------------

ALTER FUNCTION public.cascade_premium_perk_promotions() SET search_path = public;
ALTER FUNCTION public.create_premium_perk_on_listing_insert() SET search_path = public;
