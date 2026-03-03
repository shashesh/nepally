-- Add creator_id to conversations so the SELECT policy allows the creator
-- to see a newly created conversation before participants are added.
-- Fixes: INSERT + .select().single() returning 403 because the participant
-- row doesn't exist yet when PostgREST tries to SELECT the new row back.

ALTER TABLE conversations ADD COLUMN creator_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Update SELECT policy: allow creator OR participant to view
DROP POLICY "Participants can view conversations" ON conversations;
CREATE POLICY "Participants or creator can view conversations"
  ON conversations FOR SELECT
  USING (
    creator_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id AND user_id = (SELECT auth.uid())
    )
  );
