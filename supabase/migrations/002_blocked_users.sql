-- Blocked Users table for chat safety (Feature 8.7)
CREATE TABLE blocked_users (
  id BIGSERIAL PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);

-- RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks"
  ON blocked_users FOR SELECT
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can block others"
  ON blocked_users FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can unblock"
  ON blocked_users FOR DELETE
  USING (blocker_id = auth.uid());

-- Fix conversation_participants INSERT policy:
-- The original policy only allows inserting yourself (user_id = auth.uid()).
-- When creating a conversation, we need to insert BOTH participants.
-- This updated policy allows adding the other user IF you're already a participant.
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON conversation_participants;

CREATE POLICY "Users can add participants to conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- Update messages INSERT policy to prevent sending to someone who blocked you
DROP POLICY IF EXISTS "Participants can send messages" ON messages;

CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
        AND user_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users bu
      JOIN conversation_participants cp ON cp.conversation_id = messages.conversation_id
      WHERE cp.user_id != auth.uid()
        AND (
          (bu.blocker_id = cp.user_id AND bu.blocked_id = auth.uid())
          OR (bu.blocker_id = auth.uid() AND bu.blocked_id = cp.user_id)
        )
    )
  );

COMMENT ON TABLE blocked_users IS 'User block list for chat safety';
