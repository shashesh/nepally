-- 052_scrub_account_copies.sql
-- ADDITIVE / non-destructive: one trigger function replaced in place and one
-- service_role function added. No schema changes; no data changes when
-- applied (the function deletes and updates rows only when the purge calls
-- it).
--
-- Other members keep copies of a member's words in rows they own, so
-- deleting the member's auth user doesn't cascade to them (spec:
-- docs/specs/2026-09-28-account-deletion.md §3, §4.6):
--
--   - notify_on_new_message and notify_on_new_comment (001) write the
--     author's name and the first 100 characters of the text into the
--     recipient's notification, with data.sender_id / data.commenter_id.
--   - notify_on_new_like (004) puts the liker's name in the title but stores
--     no liker id, so those rows can't be matched.
--   - conversations.last_message is the first 100 characters of the last
--     message sent. The client writes it (sendMessage) and records no
--     sender.
--
-- The privacy policy says a deleted member's messages and comments are
-- removed, so the purge now removes these copies too:
--
--   notify_on_new_like(): 004's body, plus 'liker_id' in data. Like
--   notifications written before 052 have no liker id and stay; that
--   affects staging only, since production starts from an empty database.
--
--   scrub_account_copies(p_user_id): service_role only. The
--   purge-deleted-accounts edge function calls it after removing the
--   member's files and just before deleting the auth user. It must run
--   first: it finds the member's conversations through their participant
--   rows, which the cascade removes. It:
--     - deletes every notification whose data names the member as sender,
--       commenter or liker
--     - for each of the member's conversations whose newest message is
--       theirs, resets last_message and last_message_time from the newest
--       message sent by someone else, or to NULL if there is none. Other
--       conversations are left as they are.
--   Plain SECURITY INVOKER: service_role bypasses RLS and holds the table
--   privileges it needs.
--
-- Grants (041): notify_on_new_like keeps its revoke (CREATE OR REPLACE keeps
-- privileges; restated anyway). scrub_account_copies is service_role only.
--
-- Idempotent: CREATE OR REPLACE and GRANT/REVOKE can all be re-run.
--
-- Verify: npm run test:security:functions and, with the purge secrets set,
-- npm run test:security:account-purge against staging.
--
-- Rollback (forward-only): a new migration that restores 004's
-- notify_on_new_like body and drops scrub_account_copies once no deployed
-- purge calls it.

-- ---------------------------------------------------------------------------
-- 1) Like notifications record the liker
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_on_new_like()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  v_post_author_id UUID;
  v_post_title TEXT;
  v_like_count INT;
  v_notify_likes TEXT;
  v_liker_name TEXT;
BEGIN
  SELECT p.author_id, p.title, p.likes_count
  INTO v_post_author_id, v_post_title, v_like_count
  FROM public.posts p WHERE p.id = NEW.post_id;

  -- Skip if liker is the post author
  IF NEW.user_id = v_post_author_id THEN RETURN NEW; END IF;

  SELECT COALESCE(us.notify_likes, 'grouped') INTO v_notify_likes
  FROM public.user_settings us WHERE us.user_id = v_post_author_id;

  IF v_notify_likes = 'off' THEN RETURN NEW; END IF;

  IF v_notify_likes = 'all' OR (v_notify_likes = 'grouped' AND v_like_count % 5 = 0) THEN
    SELECT full_name INTO v_liker_name FROM public.users WHERE id = NEW.user_id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_post_author_id,
      'post_response',
      CASE WHEN v_notify_likes = 'all'
        THEN COALESCE(v_liker_name, 'Someone') || ' liked your post'
        ELSE v_like_count::TEXT || ' people liked your post'
      END,
      LEFT(v_post_title, 100),
      jsonb_build_object('post_id', NEW.post_id, 'like_count', v_like_count, 'liker_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.notify_on_new_like() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) The purge's scrub
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.scrub_account_copies(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.notifications n
   WHERE n.data ->> 'sender_id' = p_user_id::text
      OR n.data ->> 'commenter_id' = p_user_id::text
      OR n.data ->> 'liker_id' = p_user_id::text;

  UPDATE public.conversations c
     SET last_message = (
           SELECT LEFT(m.text, 100)
             FROM public.messages m
            WHERE m.conversation_id = c.id
              AND m.sender_id <> p_user_id
            ORDER BY m.timestamp DESC
            LIMIT 1
         ),
         last_message_time = (
           SELECT m.timestamp
             FROM public.messages m
            WHERE m.conversation_id = c.id
              AND m.sender_id <> p_user_id
            ORDER BY m.timestamp DESC
            LIMIT 1
         )
   WHERE c.id IN (
           SELECT cp.conversation_id
             FROM public.conversation_participants cp
            WHERE cp.user_id = p_user_id
         )
     AND (
           SELECT m.sender_id
             FROM public.messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.timestamp DESC
            LIMIT 1
         ) = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scrub_account_copies(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scrub_account_copies(uuid) TO service_role;
