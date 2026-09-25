-- 041_restrict_function_execute.sql
-- ADDITIVE / non-destructive: only privileges change, no schema or data.
-- Lets only the roles that need a SECURITY DEFINER function execute it, and
-- stops new functions from being executable by everyone by default.
--
--   Problem: Postgres grants EXECUTE on every new function to PUBLIC, and
--   Supabase's default privileges grant it to anon and authenticated as well.
--   So every function in public was callable by anyone through
--   /rest/v1/rpc/<name>. A SECURITY DEFINER function runs as its owner, past
--   RLS. The live exposures:
--     - increment_listing_views / increment_listing_contacts: anyone, signed
--       in or not, could inflate a listing's counters. 017 revoked PUBLIC,
--       but the explicit anon grant stayed.
--     - has_user_liked_post, get_post_like_count, get_post_comment_count,
--       get_metro_by_zip, build_notification_push_url: no app calls them, yet
--       anon could.
--     - soft_delete_event / soft_delete_own_comment: executable by anon (they
--       check auth.uid() and do nothing for anon, but anon has no business
--       calling them).
--     - Trigger functions: executable by anon and authenticated. They fail
--       when called outside a trigger, but nothing should call them directly.
--
--   Fix, per function (who needs it, from the apps' .rpc() calls, RLS
--   policies and triggers on staging, 2026-09-25):
--     - Policy helpers is_moderator, is_conversation_participant,
--       is_conversation_creator: anon + authenticated. Policies that apply
--       to every role call them (posts SELECT, conversation_participants),
--       and a policy function runs as the querying role, so revoking anon
--       would turn anon reads of those tables into permission errors.
--       Only PUBLIC is revoked.
--     - Called by the apps signed in: increment_listing_views,
--       increment_listing_contacts, soft_delete_event,
--       soft_delete_own_comment -> authenticated only. Listings are readable
--       only when signed in, so anon never needs the counters.
--     - Called by nobody but the database itself: has_user_liked_post,
--       get_post_like_count, get_post_comment_count, get_metro_by_zip,
--       build_notification_push_url (called inside the SECURITY DEFINER
--       enqueue_notification_push_delivery, which runs as the owner) ->
--       no client role.
--     - Trigger functions -> no client role. A trigger fires without the
--       firing role holding EXECUTE on its function.
--     - service_role keeps EXECUTE everywhere: edge functions, scripts and
--       the security smoke tests use it.
--     - get_my_profile, mark_user_verified, moderate_user,
--       enforce_moderated_tag_status and on_report_created are already
--       correct (034, 035, 036) and are left alone.
--
--   Default privileges: new functions that postgres creates are no longer
--   executable by PUBLIC, and new functions in public are no longer
--   executable by anon or authenticated. Every migration that adds a function
--   must now GRANT EXECUTE to the roles that call it, including a function
--   used in an RLS policy, column default or CHECK (see
--   docs/decisions/2026-09-25-function-execute-grants.md). Postgres only
--   honours revoking PUBLIC at the global level, not per schema, hence the
--   two statements.
--
-- Idempotent: GRANT/REVOKE and ALTER DEFAULT PRIVILEGES can be re-run.
--
-- Verify: npm run test:security:functions against staging.
--
-- Rollback (forward-only): a new migration that GRANTs EXECUTE back to the
-- role that needs it, and for the defaults runs
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--     GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;

-- 1. Policy helpers: every role that can hit the policies, nobody else.
REVOKE EXECUTE ON FUNCTION public.is_moderator() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_conversation_creator(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_moderator() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_conversation_creator(uuid, uuid) TO anon, authenticated, service_role;

-- 2. RPCs the apps call signed in.
REVOKE EXECUTE ON FUNCTION public.increment_listing_views(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_listing_contacts(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.soft_delete_event(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.soft_delete_own_comment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_listing_contacts(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.soft_delete_event(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.soft_delete_own_comment(uuid) TO authenticated, service_role;

-- 3. Functions no client calls.
REVOKE EXECUTE ON FUNCTION public.has_user_liked_post(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_post_like_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_post_comment_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_metro_by_zip(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.build_notification_push_url(notification_type, jsonb) FROM PUBLIC, anon, authenticated;

-- 4. Trigger functions.
REVOKE EXECUTE ON FUNCTION public.bump_follow_counts_on_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_follow_counts_on_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cascade_premium_perk_promotions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_premium_perk_on_listing_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_event_rsvp_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_post_comments_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_post_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_notification_push_delivery() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_event_rsvp_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_post_comments_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_post_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_unread_count_on_new_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_new_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_new_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_new_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sever_follows_on_block() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_event_rsvp_count() FROM PUBLIC, anon, authenticated;

-- 5. Future functions: nobody executes them until a migration grants it.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
