-- NUSA Post Interactions Migration (Likes & Comments)
-- Migration: 003_post_interactions.sql
-- Description: Adds post likes and comments functionality for social engagement
-- Dependencies: 001_initial_schema.sql (posts, users tables must exist)
-- Safe to re-run: drops all objects first (dev only — no production data)

-- =====================================================
-- TEARDOWN (drop in reverse dependency order)
-- =====================================================

-- Drop helper functions first
DROP FUNCTION IF EXISTS get_post_comment_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS has_user_liked_post(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_post_like_count(UUID) CASCADE;

-- Drop trigger functions (CASCADE will drop triggers)
DROP FUNCTION IF EXISTS decrement_post_comments_count() CASCADE;
DROP FUNCTION IF EXISTS increment_post_comments_count() CASCADE;
DROP FUNCTION IF EXISTS decrement_post_likes_count() CASCADE;
DROP FUNCTION IF EXISTS increment_post_likes_count() CASCADE;

-- Drop tables (CASCADE will drop all dependent objects)
DROP TABLE IF EXISTS post_comments CASCADE;
DROP TABLE IF EXISTS post_likes CASCADE;

-- =====================================================
-- SCHEMA CHANGES TO EXISTING TABLES
-- =====================================================

-- Add cached engagement counters to posts table
DO $$
BEGIN
  -- Add likes_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'likes_count'
  ) THEN
    ALTER TABLE posts ADD COLUMN likes_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Add comments_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'comments_count'
  ) THEN
    ALTER TABLE posts ADD COLUMN comments_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- =====================================================
-- NEW TABLES
-- =====================================================

-- Post Likes (individual like tracking)
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one like per user per post
  UNIQUE(post_id, user_id)
);

COMMENT ON TABLE post_likes IS 'Tracks individual likes on posts for social engagement';
COMMENT ON COLUMN post_likes.post_id IS 'Reference to the post being liked';
COMMENT ON COLUMN post_likes.user_id IS 'Reference to the user who liked the post';

-- Post Comments (public discussion threads)
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 1000),
  
  -- Optional: support for nested replies (unused in Phase 1)
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  
  -- Status
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE post_comments IS 'Public comment threads on posts';
COMMENT ON COLUMN post_comments.content IS 'Comment text (1-1000 characters)';
COMMENT ON COLUMN post_comments.parent_comment_id IS 'Reference to parent comment for nested replies (Phase 2)';
COMMENT ON COLUMN post_comments.is_deleted IS 'Soft delete flag - true when user deletes their comment';
COMMENT ON COLUMN post_comments.is_flagged IS 'True when comment has been reported by users';

-- =====================================================
-- INDEXES
-- =====================================================

-- Post Likes Indexes
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX idx_post_likes_created_at ON post_likes(created_at);

-- Post Comments Indexes
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX idx_post_comments_author_id ON post_comments(author_id);
CREATE INDEX idx_post_comments_parent_id ON post_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_post_comments_is_deleted ON post_comments(is_deleted) WHERE is_deleted = false;
CREATE INDEX idx_post_comments_created_at ON post_comments(created_at);

-- =====================================================
-- TRIGGERS (Counter Maintenance)
-- =====================================================

-- Increment likes_count when like is added
CREATE OR REPLACE FUNCTION increment_post_likes_count()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_post_likes_count
  AFTER INSERT ON post_likes
  FOR EACH ROW EXECUTE FUNCTION increment_post_likes_count();

-- Decrement likes_count when like is removed
CREATE OR REPLACE FUNCTION decrement_post_likes_count()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrement_post_likes_count
  AFTER DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION decrement_post_likes_count();

-- Increment comments_count when comment is added
CREATE OR REPLACE FUNCTION increment_post_comments_count()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  -- Only increment if comment is not already deleted
  IF NEW.is_deleted = false THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_post_comments_count
  AFTER INSERT ON post_comments
  FOR EACH ROW EXECUTE FUNCTION increment_post_comments_count();

-- Decrement comments_count when comment is soft-deleted
CREATE OR REPLACE FUNCTION decrement_post_comments_count()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  -- Decrement only if comment is being marked as deleted
  IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
    UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrement_post_comments_count
  AFTER UPDATE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION decrement_post_comments_count();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Post Likes RLS
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can view likes (for like counts and social proof)
CREATE POLICY "Anyone can view likes"
  ON post_likes FOR SELECT
  USING (true);

-- Level 1+ users can like posts
CREATE POLICY "Level 1+ users can like posts"
  ON post_likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND trust_level >= 1 AND is_banned = false)
  );

-- Users can unlike their own likes
CREATE POLICY "Users can unlike their own likes"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Post Comments RLS
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view non-deleted comments
CREATE POLICY "Anyone can view non-deleted comments"
  ON post_comments FOR SELECT
  USING (is_deleted = false);

-- Level 1+ users can comment
CREATE POLICY "Level 1+ users can comment"
  ON post_comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND trust_level >= 1 AND is_banned = false)
  );

-- Users can update own comments (for soft delete)
CREATE POLICY "Users can update own comments"
  ON post_comments FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Moderators can update any comment (for moderation)
CREATE POLICY "Moderators can update any comment"
  ON post_comments FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true)
  );

-- Moderators can delete comments permanently (hard delete, rare)
CREATE POLICY "Moderators can delete comments"
  ON post_comments FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true)
  );

-- =====================================================
-- HELPER FUNCTIONS (Optional, for convenience)
-- =====================================================

-- Get like count for a post
CREATE OR REPLACE FUNCTION get_post_like_count(p_post_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM post_likes WHERE post_id = p_post_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has liked a post
CREATE OR REPLACE FUNCTION has_user_liked_post(p_post_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM post_likes WHERE post_id = p_post_id AND user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get comment count for a post
CREATE OR REPLACE FUNCTION get_post_comment_count(p_post_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM post_comments WHERE post_id = p_post_id AND is_deleted = false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Note: Migration completed successfully if no errors above
-- Tables created: post_likes, post_comments
-- Columns added: posts.likes_count, posts.comments_count  
-- Triggers created: 4 triggers for counter maintenance
-- RLS policies: 7 policies (3 for likes, 4 for comments)
