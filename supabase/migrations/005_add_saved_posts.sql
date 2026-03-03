-- Migration: Add saved_posts table
-- Separate from post_likes — saves and likes are distinct actions.

CREATE TABLE saved_posts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX saved_posts_user_id_idx    ON saved_posts (user_id);
CREATE INDEX saved_posts_post_id_idx    ON saved_posts (post_id);
CREATE INDEX saved_posts_created_at_idx ON saved_posts (created_at DESC);

ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved posts"
  ON saved_posts FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can save posts"
  ON saved_posts FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unsave posts"
  ON saved_posts FOR DELETE USING (user_id = auth.uid());
