-- Migration: 005_tags_and_premium.sql
-- Date: 2026-02-17
-- Description: Replace category enum with scalable tag system, add premium/global support
--
-- Changes:
--   1. Create `tags` lookup table with 7 seeded tags
--   2. Create `post_tags` junction table (many-to-many, max 3 per post)
--   3. Add `is_global` to posts (default false)
--   4. Add `is_premium` to users (default false)
--   5. Remove `category`, `fields`, `expiry_date` from posts
--   6. Remove `expired` from post_status enum
--   7. Drop `post_category` enum type
--   8. Update saved locations limit (premium-aware, application-enforced)

-- ============================================
-- 1. Create Tags Table
-- ============================================
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,                    -- emoji or icon name (e.g., 'home', 'briefcase')
  color TEXT,                   -- hex color for UI (e.g., '#4CAF50')
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  requires_moderation BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_tags_sort ON tags(sort_order);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags are viewable by everyone"
  ON tags FOR SELECT
  USING (true);

CREATE POLICY "Only moderators can modify tags"
  ON tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true
    )
  );

-- Seed 7 initial tags
INSERT INTO tags (name, slug, icon, color, description, is_system, requires_moderation, sort_order) VALUES
  ('Housing',    'housing',    'home',      '#4CAF50', 'Rent, roommates, apartments, housing questions',     true, false, 1),
  ('Jobs',       'jobs',       'briefcase', '#2196F3', 'Job postings, hiring, career questions',             true, false, 2),
  ('Help',       'help',       'hand',      '#FF9800', 'Requests for help, assistance, favors',              true, false, 3),
  ('Question',   'question',   'question',  '#9C27B0', 'General questions about life in the US',             true, false, 4),
  ('Politics',   'politics',   'building',  '#607D8B', 'Community politics, policy discussions',             true, false, 5),
  ('Discussion', 'discussion', 'chat',      '#00BCD4', 'Open discussions, opinions, community topics',       true, false, 6),
  ('Emergency',  'emergency',  'warning',   '#F44336', 'Emergencies requiring community coordination',       true, true,  7);

-- ============================================
-- 2. Create Post Tags Junction Table
-- ============================================
CREATE TABLE post_tags (
  id BIGSERIAL PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(post_id, tag_id)
);

CREATE INDEX idx_post_tags_post ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag ON post_tags(tag_id);

-- Enforce max 3 tags per post via trigger
CREATE OR REPLACE FUNCTION check_max_post_tags()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM post_tags WHERE post_id = NEW.post_id) >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 tags per post';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_post_tags
  BEFORE INSERT ON post_tags
  FOR EACH ROW
  EXECUTE FUNCTION check_max_post_tags();

ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post tags are viewable by everyone"
  ON post_tags FOR SELECT
  USING (true);

CREATE POLICY "Post authors can manage tags"
  ON post_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts WHERE id = post_id AND author_id = auth.uid()
    )
  );

CREATE POLICY "Post authors can delete tags"
  ON post_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts WHERE id = post_id AND author_id = auth.uid()
    )
  );

-- ============================================
-- 3. Modify Posts Table
-- ============================================

-- Add is_global column
ALTER TABLE posts ADD COLUMN is_global BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX idx_posts_is_global ON posts(is_global) WHERE is_global = true;

-- Migrate existing categories to tags
INSERT INTO post_tags (post_id, tag_id)
SELECT p.id, t.id
FROM posts p
JOIN tags t ON t.slug = p.category::TEXT
WHERE p.category IS NOT NULL;

-- Drop old columns
ALTER TABLE posts DROP COLUMN IF EXISTS category;
ALTER TABLE posts DROP COLUMN IF EXISTS fields;
ALTER TABLE posts DROP COLUMN IF EXISTS expiry_date;

-- Replace the post_status enum (remove 'expired')
-- PostgreSQL ALTER TYPE ... DROP VALUE is not supported, so we recreate.
-- Must drop ALL RLS policies on posts before altering the column type,
-- because PG treats every policy on the table as potentially dependent.
DROP POLICY IF EXISTS "Active posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Verified users can create posts" ON posts;
DROP POLICY IF EXISTS "Authors and moderators can update posts" ON posts;
DROP POLICY IF EXISTS "Authors and moderators can delete posts" ON posts;

ALTER TABLE posts ALTER COLUMN status DROP DEFAULT;
ALTER TABLE posts ALTER COLUMN status TYPE TEXT;
DROP TYPE IF EXISTS post_status;
CREATE TYPE post_status AS ENUM ('active', 'removed', 'pending');
ALTER TABLE posts ALTER COLUMN status TYPE post_status USING status::post_status;
ALTER TABLE posts ALTER COLUMN status SET DEFAULT 'active'::post_status;

-- Recreate all dropped policies
CREATE POLICY "Active posts are viewable by everyone"
  ON posts FOR SELECT
  USING (status = 'active');

CREATE POLICY "Verified users can create posts"
  ON posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND trust_level >= 1
    )
    AND author_id = auth.uid()
    AND status = 'active'
  );

CREATE POLICY "Authors and moderators can update posts"
  ON posts FOR UPDATE
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true
    )
  );

CREATE POLICY "Authors and moderators can delete posts"
  ON posts FOR DELETE
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true
    )
  );

-- Drop old category enum
DROP TYPE IF EXISTS post_category;

-- Update posts index (replace old category-based index)
DROP INDEX IF EXISTS idx_posts_metro_category_status_created;
DROP INDEX IF EXISTS idx_posts_metro_status_expiry;
DROP INDEX IF EXISTS idx_posts_category;
DROP INDEX IF EXISTS idx_posts_expiry;

CREATE INDEX idx_posts_metro_status_created
  ON posts(metro_area_id, status, created_at DESC);

-- ============================================
-- 4. Modify Users Table
-- ============================================

-- Add is_premium column
ALTER TABLE users ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- 5. Enable realtime on new tables
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE tags;
ALTER PUBLICATION supabase_realtime ADD TABLE post_tags;
