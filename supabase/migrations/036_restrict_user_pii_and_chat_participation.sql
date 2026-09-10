-- 036_restrict_user_pii_and_chat_participation.sql
-- ADDITIVE / non-destructive. Closes two authorization gaps surfaced by the
-- 2026-09-08 full-design security review.
--
--   1. SECURITY (HIGH) public.users PII exposure:
--      "Users are viewable by everyone" (001) is USING (true) and the table
--      carries a table-level SELECT grant, so anyone holding the (public) anon
--      key could dump email / phone / zip_code / ban_reason for every member:
--        GET /rest/v1/users?select=full_name,email,phone,zip_code
--
--      Fix: column-level SELECT grants. The RLS policy is unchanged — rows stay
--      public because profiles are a product feature — but anon/authenticated
--      may only read the public-profile columns. Full self-reads go through
--      get_my_profile(), a SECURITY DEFINER RPC scoped to auth.uid().
--
--      The readable set is exactly what public surfaces render plus what
--      existing RLS policies and security_invoker views reference
--      (trust_level, is_moderator, is_premium, is_banned, metro_area_id, …).
--      Withheld: email, phone, zip_code, ban_reason, reports_received and the
--      *_verified flags.
--
--      Client impact: any `select('*')` / `.select()` on users from the REST
--      API now fails with "permission denied for table users". The shared
--      API (packages/shared/src/api/users.ts) selects PUBLIC_USER_COLUMNS for
--      other people's profiles and calls get_my_profile() for the caller's own
--      row, including after profile writes.
--
--   2. SECURITY (HIGH) conversation self-join:
--      "Users can add participants to conversations" (001/008) accepted any
--      row where user_id = auth.uid(), so any Level-1 user who learned a
--      conversation UUID could insert themselves and read the whole thread
--      (messages SELECT trusts membership in this table).
--
--      Fix: a caller may add participants only to a conversation they created
--      or already belong to. The client flow (insert conversation → add self →
--      add peer) is unchanged: the creator branch admits the first participant
--      insert and the participant branch admits the second.
--
-- Uses CREATE OR REPLACE / DROP POLICY IF EXISTS so re-running is harmless.
-- Live checks: `npm run test:security:users-pii`, `npm run test:security:chat-rls`.

-- ---------------------------------------------------------------------------
-- 1) Column-level SELECT on public.users
-- ---------------------------------------------------------------------------

REVOKE SELECT ON public.users FROM anon, authenticated;

GRANT SELECT (
  id,
  full_name,
  profile_photo,
  bio,
  hometown_district,
  college,
  years_in_us,
  languages,
  follower_count,
  following_count,
  metro_area_id,
  trust_level,
  is_premium,
  is_moderator,
  is_banned,
  posts_count,
  helpful_votes_received,
  created_at,
  updated_at,
  last_active_at
)
ON public.users
TO anon, authenticated;

COMMENT ON TABLE public.users IS
  'Profiles. anon/authenticated hold column-level SELECT on public-profile columns only (migration 036); email, phone, zip_code, ban_reason, reports_received and *_verified are readable by the owner via get_my_profile() and by service_role.';

-- Full own-row read. SETOF so a missing profile (auth user whose profile row
-- has not been created yet) returns zero rows rather than a null composite.
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.users
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
ROWS 1
AS $$
  SELECT u.*
  FROM public.users u
  WHERE u.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

COMMENT ON FUNCTION public.get_my_profile() IS
  'Returns the calling user''s full public.users row (including PII columns withheld from the column-level SELECT grant). Zero rows when no profile exists.';

-- ---------------------------------------------------------------------------
-- 2) Conversation participants: no self-join
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so the check does not depend on the caller's RLS view of
-- conversations (mirrors is_conversation_participant from 001/008).
CREATE OR REPLACE FUNCTION public.is_conversation_creator(conv_id UUID, uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conv_id
      AND creator_id = uid
  );
$$;

REVOKE ALL ON FUNCTION public.is_conversation_creator(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_conversation_creator(UUID, UUID) TO anon, authenticated;

DROP POLICY IF EXISTS "Users can add participants to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Conversation members can add participants" ON public.conversation_participants;

CREATE POLICY "Conversation members can add participants"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    public.is_conversation_creator(conversation_id, (SELECT auth.uid()))
    OR public.is_conversation_participant(conversation_id, (SELECT auth.uid()))
  );

-- PostgREST caches privileges with the schema; ask it to reload so the new
-- column grants take effect without a restart.
NOTIFY pgrst, 'reload schema';
