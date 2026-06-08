-- 033_fix_security_definer_view_and_rls_initplan.sql
-- ADDITIVE / non-destructive. Resolves two classes of Supabase advisor findings:
--
--   1. SECURITY (ERROR) security_definer_view:
--      public.user_helper_scores is still SECURITY DEFINER on the live DB.
--      Migration 031 intended security_invoker=true and 032 re-asserted it via
--      ALTER VIEW, but 032 never took effect on the remote (migration drift —
--      it is absent from the remote migrations tracker). This re-asserts it.
--      Safe: users/posts/post_comments/post_likes all have permissive public
--      SELECT policies, so invoker-side RLS yields the same rows (it only stops
--      counting reputation from non-active posts, matching 031's design intent).
--
--   2. PERFORMANCE (WARN) auth_rls_initplan:
--      19 RLS policies call auth.uid() (or current_setting()) per-row. Wrapping
--      the call as (select auth.uid()) lets Postgres evaluate it once per query
--      (initplan) instead of once per row. This is the documented Supabase fix
--      and is strictly behaviour-preserving — the returned value is identical.
--      Ref: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- Uses ALTER POLICY / ALTER VIEW (not DROP+CREATE) so there is no window where a
-- policy is missing, and re-running is harmless.
--
-- Not in scope (intentional, noted as follow-ups):
--   - multiple_permissive_policies on listing_promotions (two SELECT policies are
--     a deliberate OR from migration 024) and user_settings (a redundant SELECT
--     policy alongside the FOR ALL policy). Left untouched to keep this change
--     behaviour-preserving.
--
-- Rollback: forward-only migration re-asserting the bare auth.uid() forms and
--   ALTER VIEW ... SET (security_invoker = false). Not recommended.

BEGIN;

-- ─── 1) SECURITY DEFINER view ────────────────────────────────────────────────
ALTER VIEW public.user_helper_scores SET (security_invoker = true);

-- ─── 2) auth_rls_initplan: wrap auth.uid() in a scalar subquery ───────────────

-- saved_posts
ALTER POLICY "Users can view their own saved posts" ON public.saved_posts
  USING (user_id = (select auth.uid()));
ALTER POLICY "Users can save posts" ON public.saved_posts
  WITH CHECK (user_id = (select auth.uid()));
ALTER POLICY "Users can unsave posts" ON public.saved_posts
  USING (user_id = (select auth.uid()));

-- events
ALTER POLICY "events_insert" ON public.events
  WITH CHECK (
    ((select auth.uid()) IS NOT NULL)
    AND (organizer_id = (select auth.uid()))
    AND (EXISTS (
      SELECT 1 FROM users
      WHERE ((users.id = (select auth.uid())) AND (users.trust_level >= 1))
    ))
  );
ALTER POLICY "events_update" ON public.events
  USING ((organizer_id = (select auth.uid())) AND (status <> 'removed'::event_status))
  WITH CHECK (organizer_id = (select auth.uid()));
ALTER POLICY "events_delete" ON public.events
  USING (organizer_id = (select auth.uid()));

-- event_rsvps
ALTER POLICY "rsvps_select" ON public.event_rsvps
  USING (EXISTS (
    SELECT 1 FROM events
    WHERE (
      (events.id = event_rsvps.event_id)
      AND (events.status <> 'removed'::event_status)
      AND (
        (events.rsvp_visibility = 'public'::text)
        OR (events.organizer_id = (select auth.uid()))
        OR (event_rsvps.user_id = (select auth.uid()))
      )
    )
  ));
ALTER POLICY "rsvps_insert" ON public.event_rsvps
  WITH CHECK (
    (user_id = (select auth.uid()))
    AND (EXISTS (
      SELECT 1 FROM users
      WHERE ((users.id = (select auth.uid())) AND (users.trust_level >= 1))
    ))
    AND (EXISTS (
      SELECT 1 FROM events
      WHERE ((events.id = event_rsvps.event_id) AND (events.status = 'active'::event_status))
    ))
  );
ALTER POLICY "rsvps_update" ON public.event_rsvps
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
ALTER POLICY "rsvps_delete" ON public.event_rsvps
  USING (user_id = (select auth.uid()));

-- notifications (SELECT/UPDATE already use the subquery form; only DELETE remains)
ALTER POLICY "Users can delete own notifications" ON public.notifications
  USING ((select auth.uid()) = user_id);

-- marketplace_listings
ALTER POLICY "Anyone can read active listings" ON public.marketplace_listings
  USING ((status = 'active'::listing_status) OR (owner_id = (select auth.uid())));
ALTER POLICY "Verified users can create listings" ON public.marketplace_listings
  WITH CHECK (
    (owner_id = (select auth.uid()))
    AND (EXISTS (
      SELECT 1 FROM users
      WHERE ((users.id = (select auth.uid())) AND (users.trust_level >= 1))
    ))
  );
ALTER POLICY "Owners can update their listings" ON public.marketplace_listings
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));
ALTER POLICY "Owners can delete their listings" ON public.marketplace_listings
  USING (owner_id = (select auth.uid()));

-- saved_listings
ALTER POLICY "Users can read own saved listings" ON public.saved_listings
  USING (user_id = (select auth.uid()));
ALTER POLICY "Users can save listings" ON public.saved_listings
  WITH CHECK (user_id = (select auth.uid()));
ALTER POLICY "Users can unsave listings" ON public.saved_listings
  USING (user_id = (select auth.uid()));

-- listing_promotions
ALTER POLICY "Users can read own promotions" ON public.listing_promotions
  USING (user_id = (select auth.uid()));

COMMIT;
