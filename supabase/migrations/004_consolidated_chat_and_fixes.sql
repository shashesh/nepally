-- =============================================================================
-- 004_consolidated_chat_and_fixes.sql
-- Consolidates migrations 004–009 for clean PROD deployment.
-- All changes have been applied to dev/local databases individually.
-- Apply this single file to a fresh PROD database (after 003_storage.sql).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- SECTION 1: conversations — add creator_id column + update SELECT policy
-- (was: 004_conversations_add_creator_id.sql)
--
-- Adds creator_id so the SELECT policy allows the creator to see a newly
-- created conversation before participants are added. Fixes: INSERT + .select()
-- .single() returning 403 because the participant row doesn't exist yet when
-- PostgREST tries to SELECT the new row back.
-- -----------------------------------------------------------------------------

ALTER TABLE conversations ADD COLUMN creator_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Update SELECT policy: allow creator OR participant to view
DROP POLICY IF EXISTS "Participants can view conversations" ON conversations;
CREATE POLICY "Participants or creator can view conversations"
  ON conversations FOR SELECT
  USING (
    creator_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id AND user_id = (SELECT auth.uid())
    )
  );


-- -----------------------------------------------------------------------------
-- SECTION 2: conversation_participants — enable Realtime
-- (was: 005_add_conversation_participants_realtime.sql)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversation_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- SECTION 3: messages — trigger to increment unread_count on new message
-- (was: 006_increment_unread_count_on_new_message.sql)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_unread_count_on_new_message()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id <> NEW.sender_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS trigger_increment_unread_on_new_message ON public.messages;

CREATE TRIGGER trigger_increment_unread_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.increment_unread_count_on_new_message();


-- -----------------------------------------------------------------------------
-- SECTION 4: notifications — include liker's name in like notifications
-- (was: 007_fix_like_notification_username.sql)
--
-- Previously used hardcoded "Someone liked your post"; now matches the comment
-- notification pattern by fetching the liker's full_name.
-- -----------------------------------------------------------------------------

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
      jsonb_build_object('post_id', NEW.post_id, 'like_count', v_like_count)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';


-- -----------------------------------------------------------------------------
-- SECTION 5: post_comments — fix UPDATE policy so authors can soft-delete
-- (was: 008_fix_post_comments_update_policy.sql)
-- -----------------------------------------------------------------------------

GRANT SELECT, UPDATE ON TABLE public.post_comments TO authenticated;

DROP POLICY IF EXISTS "Users and moderators can update comments" ON public.post_comments;
DROP POLICY IF EXISTS "Comment authors and moderators can update comments" ON public.post_comments;

CREATE POLICY "Comment authors and moderators can update comments"
  ON public.post_comments FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = author_id
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = (select auth.uid())
        AND is_moderator = true
    )
  )
  WITH CHECK (
    (select auth.uid()) = author_id
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = (select auth.uid())
        AND is_moderator = true
    )
  );


-- -----------------------------------------------------------------------------
-- SECTION 6: post_comments — SECURITY DEFINER RPC for comment soft-delete
-- (was: 009_add_soft_delete_comment_rpc.sql)
--
-- Avoids client-side RLS edge cases by running the soft-delete check in a
-- server-side function with elevated privileges.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.soft_delete_own_comment(p_comment_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_can_delete BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT (
    pc.author_id = v_user_id
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = v_user_id
        AND u.is_moderator = true
    )
  )
  INTO v_can_delete
  FROM public.post_comments pc
  WHERE pc.id = p_comment_id
    AND pc.is_deleted = false;

  IF NOT COALESCE(v_can_delete, false) THEN
    RETURN false;
  END IF;

  UPDATE public.post_comments
  SET is_deleted = true,
      updated_at = now()
  WHERE id = p_comment_id
    AND is_deleted = false;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_own_comment(UUID) TO authenticated;
