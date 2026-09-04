-- 035_emergency_post_moderation.sql
-- ADDITIVE / non-destructive. Makes the Emergency (moderated) post flow work
-- end-to-end and adds the server-side pieces the moderator queue needs.
--
-- Problems fixed (all confirmed on the live project 2026-09-04):
--   1. Emergency posts could not be created. The Emergency tag is seeded with
--      requires_moderation = true, so createPost() inserts status = 'pending',
--      but the posts INSERT policy (001) only allowed status = 'active' — RLS
--      rejected every Emergency post. The SELECT policy was active-only too,
--      so a pending post would have been invisible to its author and to
--      moderators.
--   2. Authors could self-approve: the posts UPDATE policy has no WITH CHECK,
--      so an author could flip their own pending post to 'active'.
--   3. Moderators had no way to ban a user — the own-row users UPDATE policy
--      (plus the 034 guard) blocks it — and is_banned was not enforced on
--      posts at all.
--   4. The roadmap's "3+ reports auto-hides a post" rule and the
--      posts.reports_count / users.reports_received counters were never wired,
--      and nothing stopped one user from filing the same report repeatedly.
--   5. user_helper_scores (031) relied on the posts SELECT policy being
--      active-only. Now that authors and moderators can see other statuses,
--      the view filters on status explicitly so scores stay stable.
--   6. Report submission was broken for everyone but moderators. createReport()
--      inserts with RETURNING (PostgREST insert().select()), and Postgres
--      applies SELECT policies to RETURNING rows; the only SELECT policy on
--      reports was moderator-only, so every ordinary report insert failed with
--      "new row violates row-level security policy". Reporters can now read
--      their own reports.
--   7. Emergency review was enforced only by the client. createPost() decides
--      status = 'pending' from a caller-supplied flag, so a verified user could
--      insert an active post over REST and link the Emergency tag in post_tags
--      directly, publishing an unreviewed Emergency post. An AFTER INSERT
--      trigger on post_tags now moves the post back to 'pending' whenever a
--      signed-in non-moderator attaches a tag with requires_moderation = true.
--
-- Changes:
--   - public.is_moderator(): STABLE SECURITY DEFINER helper for the caller.
--   - posts INSERT policy: status IN ('active','pending'); author not banned.
--   - posts SELECT policy: active posts for everyone; own posts (any status);
--     every post for moderators.
--   - guard_post_status_transition(): BEFORE UPDATE OF status trigger —
--     non-moderator clients may only move their own post to 'removed'.
--   - moderate_user(p_user_id, p_banned, p_reason): moderator-only RPC that
--     sets is_banned / ban_reason and, when banning, removes the user's active
--     and pending posts. Cannot target self or another moderator.
--   - on_report_created(): AFTER INSERT trigger on reports — bumps
--     posts.reports_count / users.reports_received and auto-hides an active
--     post (status -> 'pending') once it reaches 3 reports.
--   - reports: unique partial index — one open report per (reporter, target).
--   - enforce_moderated_tag_status(): AFTER INSERT trigger on post_tags —
--     force-reverts an active post to 'pending' when a signed-in
--     non-moderator attaches a requires_moderation tag, closing the gap
--     where createPost()'s status choice was trusted from the client.
--   - user_helper_scores: explicit p.status = 'active' filters.
--
-- Uses ALTER POLICY / CREATE OR REPLACE so there is no window without a
-- policy and re-running is harmless.
--
-- Live check: npm run test:security:emergency-post
--
-- Follow-ups (not in scope): is_banned is enforced on posts (here) and on
-- comments/likes (001); events and marketplace listings still accept inserts
-- from banned users. The legacy verify-emergency-post edge function targets
-- the pre-tag schema (category/fields) and is superseded by the moderation
-- page calling setPostModerationStatus().

-- ---------------------------------------------------------------------------
-- 1) Caller helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT u.is_moderator FROM public.users u WHERE u.id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_moderator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_moderator() TO anon, authenticated;

COMMENT ON FUNCTION public.is_moderator() IS
  'True when the calling user (auth.uid()) has users.is_moderator = true.';

-- ---------------------------------------------------------------------------
-- 2) Posts policies
-- ---------------------------------------------------------------------------

ALTER POLICY "Verified users can create posts" ON public.posts
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid())
        AND trust_level >= 1
        AND is_banned = false
    )
    AND author_id = (select auth.uid())
    AND status IN ('active', 'pending')
  );

ALTER POLICY "Active posts are viewable by everyone" ON public.posts
  USING (
    status = 'active'
    OR author_id = (select auth.uid())
    OR (select public.is_moderator())
  );

-- ---------------------------------------------------------------------------
-- 3) Status transitions: only moderators approve / hide; authors may only
--    take their own post down.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_post_status_transition()
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

  IF NEW.status = 'removed' AND OLD.author_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Post status can only be changed by a moderator'
    USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.guard_post_status_transition() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_post_status_transition ON public.posts;
CREATE TRIGGER trg_guard_post_status_transition
  BEFORE UPDATE OF status ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_post_status_transition();

-- ---------------------------------------------------------------------------
-- 4) Ban / unban (moderator-only RPC)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.moderate_user(
  p_user_id uuid,
  p_banned  boolean,
  p_reason  text DEFAULT NULL
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller        uuid := auth.uid();
  v_target_is_mod boolean;
  v_row           public.users;
BEGIN
  IF v_caller IS NULL OR NOT public.is_moderator() THEN
    RAISE EXCEPTION 'Only moderators can ban or unban users' USING ERRCODE = '42501';
  END IF;

  IF p_user_id = v_caller THEN
    RAISE EXCEPTION 'Moderators cannot ban themselves' USING ERRCODE = '22023';
  END IF;

  SELECT is_moderator INTO v_target_is_mod FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_target_is_mod THEN
    RAISE EXCEPTION 'Moderators cannot be banned through this action' USING ERRCODE = '42501';
  END IF;

  UPDATE public.users
     SET is_banned  = p_banned,
         ban_reason = CASE WHEN p_banned THEN NULLIF(btrim(p_reason), '') ELSE NULL END,
         updated_at = now()
   WHERE id = p_user_id
   RETURNING * INTO v_row;

  IF p_banned THEN
    UPDATE public.posts
       SET status = 'removed', updated_at = now()
     WHERE author_id = p_user_id
       AND status IN ('active', 'pending');
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_user(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_user(uuid, boolean, text) TO authenticated;

COMMENT ON FUNCTION public.moderate_user(uuid, boolean, text) IS
  'Moderator-only: ban (removes the user''s live/pending posts) or unban a user. Rejects self and other moderators.';

-- ---------------------------------------------------------------------------
-- 5) Reports: counters, auto-hide at 3, one open report per reporter/target
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.on_report_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author uuid;
  v_count  integer;
  v_status public.post_status;
BEGIN
  IF NEW.target_type = 'post' THEN
    UPDATE public.posts
       SET reports_count = reports_count + 1
     WHERE id = NEW.target_id
     RETURNING author_id, reports_count, status INTO v_author, v_count, v_status;

    IF FOUND THEN
      IF v_status = 'active' AND v_count >= 3 THEN
        UPDATE public.posts
           SET status = 'pending', updated_at = now()
         WHERE id = NEW.target_id;
      END IF;

      UPDATE public.users
         SET reports_received = reports_received + 1
       WHERE id = v_author;
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

DROP TRIGGER IF EXISTS trg_on_report_created ON public.reports;
CREATE TRIGGER trg_on_report_created
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.on_report_created();

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_one_open_per_reporter_target
  ON public.reports (reported_by, target_type, target_id)
  WHERE status = 'pending';

-- Reporters can read their own reports (needed for INSERT ... RETURNING).
-- Kept as a single permissive SELECT policy to avoid the
-- multiple_permissive_policies advisor warning. The rename is guarded so
-- re-running this file after the policy has already been renamed is a no-op.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reports'
      AND policyname = 'Moderators can view reports'
  ) THEN
    ALTER POLICY "Moderators can view reports" ON public.reports
      RENAME TO "Moderators and reporters can view reports";
  END IF;
END
$$;

ALTER POLICY "Moderators and reporters can view reports" ON public.reports
  USING (
    (select public.is_moderator())
    OR reported_by = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 5b) Moderated tags force review server-side (closes the client-only check)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_moderated_tag_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function must run as SECURITY DEFINER so its UPDATE below can pass
  -- guard_post_status_transition (which only lets moderators, or non-'anon'/
  -- 'authenticated' current_user, change status). That side effect means
  -- current_user is ALWAYS the function owner in here, not the caller — the
  -- current_user check the other 035/034 triggers use would be wrong. auth.uid()
  -- reads the JWT GUC directly, so it still reflects the real caller: NULL
  -- means no end-user session (service_role / dashboard / migration).
  IF auth.uid() IS NULL OR public.is_moderator() THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tags t
    WHERE t.id = NEW.tag_id AND t.requires_moderation = true
  ) THEN
    -- Runs as the function owner, so guard_post_status_transition lets it through.
    UPDATE public.posts
       SET status = 'pending', updated_at = now()
     WHERE id = NEW.post_id
       AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_moderated_tag_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_moderated_tag_status ON public.post_tags;
CREATE TRIGGER trg_enforce_moderated_tag_status
  AFTER INSERT ON public.post_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_moderated_tag_status();

COMMENT ON FUNCTION public.enforce_moderated_tag_status() IS
  'When an end user attaches a requires_moderation tag to a live post, the post goes back to pending review. Moderators and privileged roles are exempt.';

-- ---------------------------------------------------------------------------
-- 6) Helper score view: explicit active-post filter (same columns as 031)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.user_helper_scores
WITH (security_invoker = true) AS
WITH comments_on_others AS (
  SELECT
    c.author_id AS user_id,
    COUNT(*) AS n
  FROM public.post_comments c
  JOIN public.posts p ON p.id = c.post_id
  WHERE c.is_deleted = false
    AND p.status = 'active'
    AND c.author_id <> p.author_id
    AND c.created_at >= (now() - interval '365 days')
  GROUP BY c.author_id
),
likes_received AS (
  SELECT
    p.author_id AS user_id,
    COUNT(*) AS n
  FROM public.post_likes pl
  JOIN public.posts p ON p.id = pl.post_id
  WHERE p.status = 'active'
    AND pl.created_at >= (now() - interval '365 days')
  GROUP BY p.author_id
)
SELECT
  u.id AS user_id,
  u.metro_area_id,
  COALESCE(coa.n, 0) AS helpful_comments,
  COALESCE(lr.n, 0) AS likes_received_on_own_posts,
  (COALESCE(coa.n, 0) * 2 + COALESCE(lr.n, 0) * 1) AS helper_score
FROM public.users u
LEFT JOIN comments_on_others coa ON coa.user_id = u.id
LEFT JOIN likes_received lr ON lr.user_id = u.id
WHERE u.is_banned = false;
