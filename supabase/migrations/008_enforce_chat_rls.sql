-- Migration 008: Enforce chat RLS policies and baseline
-- Purpose: harden chat table isolation and provide an idempotent policy baseline.

-- Ensure RLS is enabled on all chat tables.
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Keep helper function definition current so participant checks do not recurse.
CREATE OR REPLACE FUNCTION is_conversation_participant(conv_id UUID, uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id
      AND user_id = uid
  );
$$;

-- Recreate chat policies idempotently to enforce known-good behavior.
DROP POLICY IF EXISTS "Participants or creator can view conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;

CREATE POLICY "Participants or creator can view conversations"
  ON conversations FOR SELECT
  USING (
    creator_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
        AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
        AND trust_level >= 1
    )
  );

CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
        AND user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can view conversation members" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON conversation_participants;

CREATE POLICY "Participants can view conversation members"
  ON conversation_participants FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR is_conversation_participant(conversation_id, (SELECT auth.uid()))
  );

CREATE POLICY "Users can add participants to conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR is_conversation_participant(conversation_id, (SELECT auth.uid()))
  );

CREATE POLICY "Users can update own participation"
  ON conversation_participants FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Participants can view messages" ON messages;
DROP POLICY IF EXISTS "Participants can send messages" ON messages;
DROP POLICY IF EXISTS "Senders can update own messages" ON messages;
DROP POLICY IF EXISTS "Senders can delete own messages" ON messages;

CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
        AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
        AND user_id = (SELECT auth.uid())
    )
    AND NOT EXISTS (
      SELECT 1
      FROM blocked_users bu
      JOIN conversation_participants cp
        ON cp.conversation_id = messages.conversation_id
      WHERE cp.user_id != (SELECT auth.uid())
        AND (
          (bu.blocker_id = cp.user_id AND bu.blocked_id = (SELECT auth.uid()))
          OR (bu.blocker_id = (SELECT auth.uid()) AND bu.blocked_id = cp.user_id)
        )
    )
  );

CREATE POLICY "Senders can update own messages"
  ON messages FOR UPDATE
  USING (sender_id = (SELECT auth.uid()));

CREATE POLICY "Senders can delete own messages"
  ON messages FOR DELETE
  USING (sender_id = (SELECT auth.uid()));
