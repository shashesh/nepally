-- Migration: 007_fix_chat_rls.sql
-- Date: 2026-02-22
-- Description: Fix RLS policies that prevent chat from working
--
-- Bugs fixed:
--   1. conversation_participants SELECT policy only showed own rows,
--      so getConversations() could never fetch the other participant's
--      name/id — resulting in an empty conversation list for all users.
--      Also broke unread_count increment in sendMessage().
--   2. blocked_users SELECT policy only showed blocks you created,
--      so bidirectional block checks (isBlocked, getConversations filter)
--      couldn't detect when the OTHER user blocked you.

-- ============================================
-- 1. Fix conversation_participants SELECT
-- ============================================
-- Old policy: USING (user_id = auth.uid())
--   → Only your own rows visible. Queries for other participants return empty.
-- New policy: If you're a participant in the conversation, you can see all
--   participants in that conversation.

DROP POLICY IF EXISTS "Users can view own participation" ON conversation_participants;

CREATE POLICY "Participants can view conversation members"
  ON conversation_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- ============================================
-- 2. Fix blocked_users SELECT
-- ============================================
-- Old policy: USING (blocker_id = auth.uid())
--   → Only blocks you created visible. Can't detect if someone blocked you.
-- New policy: See blocks in either direction involving you.

DROP POLICY IF EXISTS "Users can view their own blocks" ON blocked_users;

CREATE POLICY "Users can view blocks involving them"
  ON blocked_users FOR SELECT
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());
