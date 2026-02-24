-- NUSA Complete Database Schema
-- Consolidated from 7 incremental migrations into a single clean file
-- representing the final correct state of the database.
-- Safe to re-run on a fresh database (drops all objects first).

-- =====================================================
-- TEARDOWN (drop in reverse dependency order)
-- =====================================================

DROP TABLE IF EXISTS post_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS user_saved_locations CASCADE;
DROP TABLE IF EXISTS post_comments CASCADE;
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS blocked_users CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS metro_area_zipcodes CASCADE;
DROP TABLE IF EXISTS metro_areas CASCADE;

DROP TYPE IF EXISTS notification_type;
DROP TYPE IF EXISTS report_action;
DROP TYPE IF EXISTS report_status;
DROP TYPE IF EXISTS report_target_type;
DROP TYPE IF EXISTS message_type;
DROP TYPE IF EXISTS post_status;

DROP FUNCTION IF EXISTS check_max_post_tags() CASCADE;
DROP FUNCTION IF EXISTS check_max_saved_locations() CASCADE;
DROP FUNCTION IF EXISTS get_post_comment_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS has_user_liked_post(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_post_like_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS decrement_post_comments_count() CASCADE;
DROP FUNCTION IF EXISTS increment_post_comments_count() CASCADE;
DROP FUNCTION IF EXISTS decrement_post_likes_count() CASCADE;
DROP FUNCTION IF EXISTS increment_post_likes_count() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_saved_location_timestamp() CASCADE;
DROP FUNCTION IF EXISTS get_metro_by_zip(TEXT) CASCADE;

-- =====================================================
-- EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =====================================================
-- CUSTOM TYPES
-- =====================================================

CREATE TYPE post_status AS ENUM ('active', 'removed', 'pending');
CREATE TYPE message_type AS ENUM ('text', 'image', 'system');
CREATE TYPE report_target_type AS ENUM ('post', 'user', 'message');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');
CREATE TYPE report_action AS ENUM ('removed', 'warned', 'banned', 'none');
CREATE TYPE notification_type AS ENUM ('message', 'post_response', 'emergency_alert', 'system');

-- =====================================================
-- TABLES
-- =====================================================

-- Metro Areas (IDs are CBSA codes, e.g. '19100' for Dallas-Fort Worth)
CREATE TABLE metro_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  population INTEGER,
  cbsa_type TEXT DEFAULT 'metropolitan',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Metro Area ZIP Codes (each ZIP maps to exactly one metro)
CREATE TABLE metro_area_zipcodes (
  id BIGSERIAL PRIMARY KEY,
  metro_area_id TEXT NOT NULL REFERENCES metro_areas(id) ON DELETE CASCADE,
  zip_code TEXT NOT NULL UNIQUE
);

-- Users (extends auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  profile_photo TEXT,

  -- Location
  metro_area_id TEXT REFERENCES metro_areas(id),
  zip_code TEXT,

  -- Trust & Safety
  trust_level INTEGER NOT NULL DEFAULT 0 CHECK (trust_level >= 0 AND trust_level <= 2),
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  facebook_verified BOOLEAN DEFAULT false,
  google_verified BOOLEAN DEFAULT false,

  -- Engagement
  posts_count INTEGER NOT NULL DEFAULT 0,
  helpful_votes_received INTEGER NOT NULL DEFAULT 0,
  reports_received INTEGER NOT NULL DEFAULT 0,

  -- Moderation
  is_banned BOOLEAN NOT NULL DEFAULT false,
  ban_reason TEXT,
  is_moderator BOOLEAN NOT NULL DEFAULT false,

  -- Premium
  is_premium BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Location
  metro_area_id TEXT NOT NULL REFERENCES metro_areas(id),
  location_zip_code TEXT NOT NULL,
  location_city TEXT NOT NULL,
  location_state TEXT NOT NULL,
  location_lat NUMERIC(10, 7),
  location_lng NUMERIC(10, 7),

  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  photos TEXT[] DEFAULT '{}',

  -- Status
  status post_status NOT NULL DEFAULT 'active',

  -- Global visibility (premium feature)
  is_global BOOLEAN NOT NULL DEFAULT false,

  -- Engagement
  views_count INTEGER NOT NULL DEFAULT 0,
  responses_count INTEGER NOT NULL DEFAULT 0,
  reports_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversations (1:1 DMs between user pairs)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversation Participants
CREATE TABLE conversation_participants (
  id BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type message_type NOT NULL DEFAULT 'text',
  image_url TEXT,
  system_message_type TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type report_target_type NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status report_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  action report_action,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blocked Users
CREATE TABLE blocked_users (
  id BIGSERIAL PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Post Likes
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Post Comments
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 1000),
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Saved Locations
CREATE TABLE user_saved_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metro_area_id TEXT NOT NULL REFERENCES metro_areas(id),
  label TEXT NOT NULL CHECK (LENGTH(label) BETWEEN 1 AND 50),
  zip_code TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, label)
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  requires_moderation BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Post Tags (many-to-many junction)
CREATE TABLE post_tags (
  id BIGSERIAL PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(post_id, tag_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Metro Areas
CREATE INDEX idx_metro_areas_state ON metro_areas(state);

-- Metro ZIP Codes
CREATE INDEX idx_metro_zipcodes_zip ON metro_area_zipcodes(zip_code);
CREATE INDEX idx_metro_zipcodes_metro ON metro_area_zipcodes(metro_area_id);

-- Users
CREATE INDEX idx_users_metro_area ON users(metro_area_id);
CREATE INDEX idx_users_is_moderator ON users(is_moderator) WHERE is_moderator = true;
CREATE INDEX idx_users_trust_level ON users(trust_level);
CREATE INDEX idx_users_email ON users(email);

-- Posts
CREATE INDEX idx_posts_metro_status_created
  ON posts(metro_area_id, status, created_at DESC);
CREATE INDEX idx_posts_author_created
  ON posts(author_id, created_at DESC);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_is_global ON posts(is_global) WHERE is_global = true;

-- Conversations
CREATE INDEX idx_conversations_last_message ON conversations(last_message_time DESC);

-- Conversation Participants
CREATE INDEX idx_conv_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conv_participants_user_unread
  ON conversation_participants(user_id, unread_count) WHERE unread_count > 0;

-- Messages
CREATE INDEX idx_messages_conversation_timestamp
  ON messages(conversation_id, timestamp ASC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_unread
  ON messages(conversation_id, read) WHERE read = false;

-- Reports
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_status_created ON reports(status, created_at DESC);
CREATE INDEX idx_reports_target ON reports(target_type, target_id);
CREATE INDEX idx_reports_reported_by ON reports(reported_by);

-- Notifications
CREATE INDEX idx_notifications_user_sent ON notifications(user_id, sent_at DESC);
CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, read) WHERE read = false;

-- Blocked Users
CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);

-- Post Likes
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX idx_post_likes_created_at ON post_likes(created_at);

-- Post Comments
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX idx_post_comments_author_id ON post_comments(author_id);
CREATE INDEX idx_post_comments_parent_id ON post_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_post_comments_is_deleted ON post_comments(is_deleted) WHERE is_deleted = false;
CREATE INDEX idx_post_comments_created_at ON post_comments(created_at);

-- User Saved Locations
CREATE INDEX idx_user_saved_locations_user ON user_saved_locations(user_id);

-- Tags
CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_tags_sort ON tags(sort_order);

-- Post Tags
CREATE INDEX idx_post_tags_post ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag ON post_tags(tag_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Auto-update updated_at timestamp (shared by most tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Auto-update updated_at timestamp for user_saved_locations
CREATE OR REPLACE FUNCTION update_saved_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Get metro area by ZIP code
CREATE OR REPLACE FUNCTION get_metro_by_zip(zip TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  state TEXT,
  population INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.name, m.state, m.population
  FROM public.metro_areas m
  JOIN public.metro_area_zipcodes z ON m.id = z.metro_area_id
  WHERE z.zip_code = zip
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Enforce max 5 saved locations per user
CREATE OR REPLACE FUNCTION check_max_saved_locations()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.user_saved_locations WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 saved locations per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Enforce max 3 tags per post
CREATE OR REPLACE FUNCTION check_max_post_tags()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.post_tags WHERE post_id = NEW.post_id) >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 tags per post';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Post likes counter triggers
CREATE OR REPLACE FUNCTION increment_post_likes_count()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION decrement_post_likes_count()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Post comments counter triggers
CREATE OR REPLACE FUNCTION increment_post_comments_count()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.is_deleted = false THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION decrement_post_comments_count()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
    UPDATE public.posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Helper: get like count for a post
CREATE OR REPLACE FUNCTION get_post_like_count(p_post_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.post_likes WHERE post_id = p_post_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Helper: check if user has liked a post
CREATE OR REPLACE FUNCTION has_user_liked_post(p_post_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.post_likes WHERE post_id = p_post_id AND user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Helper: get comment count for a post
CREATE OR REPLACE FUNCTION get_post_comment_count(p_post_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.post_comments WHERE post_id = p_post_id AND is_deleted = false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_saved_location_updated_at
  BEFORE UPDATE ON user_saved_locations
  FOR EACH ROW EXECUTE FUNCTION update_saved_location_timestamp();

-- Saved locations max enforcement
CREATE TRIGGER enforce_max_saved_locations
  BEFORE INSERT ON user_saved_locations
  FOR EACH ROW EXECUTE FUNCTION check_max_saved_locations();

-- Post tags max enforcement
CREATE TRIGGER enforce_max_post_tags
  BEFORE INSERT ON post_tags
  FOR EACH ROW EXECUTE FUNCTION check_max_post_tags();

-- Post likes counters
CREATE TRIGGER trigger_increment_post_likes_count
  AFTER INSERT ON post_likes
  FOR EACH ROW EXECUTE FUNCTION increment_post_likes_count();

CREATE TRIGGER trigger_decrement_post_likes_count
  AFTER DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION decrement_post_likes_count();

-- Post comments counters
CREATE TRIGGER trigger_increment_post_comments_count
  AFTER INSERT ON post_comments
  FOR EACH ROW EXECUTE FUNCTION increment_post_comments_count();

CREATE TRIGGER trigger_decrement_post_comments_count
  AFTER UPDATE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION decrement_post_comments_count();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE metro_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE metro_area_zipcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

-- ----- Metro Areas -----

CREATE POLICY "Metro areas are viewable by everyone"
  ON metro_areas FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert metro areas"
  ON metro_areas FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

CREATE POLICY "Only service role can update metro areas"
  ON metro_areas FOR UPDATE
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

CREATE POLICY "Only service role can delete metro areas"
  ON metro_areas FOR DELETE
  USING ((select auth.role()) = 'service_role');

-- ----- Metro ZIP Codes -----

CREATE POLICY "Metro ZIP codes are viewable by everyone"
  ON metro_area_zipcodes FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert metro ZIP codes"
  ON metro_area_zipcodes FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

CREATE POLICY "Only service role can update metro ZIP codes"
  ON metro_area_zipcodes FOR UPDATE
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

CREATE POLICY "Only service role can delete metro ZIP codes"
  ON metro_area_zipcodes FOR DELETE
  USING ((select auth.role()) = 'service_role');

-- ----- Users -----

CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING ((select auth.uid()) = id);

CREATE POLICY "Moderators can delete users"
  ON users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = (select auth.uid()) AND is_moderator = true
    )
  );

-- ----- Posts -----

CREATE POLICY "Active posts are viewable by everyone"
  ON posts FOR SELECT
  USING (status = 'active');

CREATE POLICY "Verified users can create posts"
  ON posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (select auth.uid())
      AND trust_level >= 1
    )
    AND author_id = (select auth.uid())
    AND status = 'active'
  );

CREATE POLICY "Authors and moderators can update posts"
  ON posts FOR UPDATE
  USING (
    author_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM users WHERE id = (select auth.uid()) AND is_moderator = true
    )
  );

CREATE POLICY "Authors and moderators can delete posts"
  ON posts FOR DELETE
  USING (
    author_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM users WHERE id = (select auth.uid()) AND is_moderator = true
    )
  );

-- ----- Conversations -----

CREATE POLICY "Participants can view conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id AND user_id = (select auth.uid())
    )
  );

CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = (select auth.uid()) AND trust_level >= 1
    )
  );

CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id AND user_id = (select auth.uid())
    )
  );

-- ----- Conversation Participants -----

-- Helper: checks participation without triggering RLS (SECURITY DEFINER bypasses RLS,
-- preventing infinite recursion when policies query the same table).
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
  USING (user_id = (select auth.uid()));

-- ----- Messages -----

CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = (select auth.uid())
    )
  );

-- INSERT: includes block check to prevent messaging blocked users (from 002)
CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
        AND user_id = (select auth.uid())
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users bu
      JOIN conversation_participants cp ON cp.conversation_id = messages.conversation_id
      WHERE cp.user_id != (select auth.uid())
        AND (
          (bu.blocker_id = cp.user_id AND bu.blocked_id = (select auth.uid()))
          OR (bu.blocker_id = (select auth.uid()) AND bu.blocked_id = cp.user_id)
        )
    )
  );

CREATE POLICY "Senders can update own messages"
  ON messages FOR UPDATE
  USING (sender_id = (select auth.uid()));

CREATE POLICY "Senders can delete own messages"
  ON messages FOR DELETE
  USING (sender_id = (select auth.uid()));

-- ----- Reports -----

CREATE POLICY "Moderators can view reports"
  ON reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = (select auth.uid()) AND is_moderator = true
    )
  );

CREATE POLICY "Verified users can create reports"
  ON reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = (select auth.uid()) AND trust_level >= 1
    )
    AND reported_by = (select auth.uid())
  );

CREATE POLICY "Moderators can update reports"
  ON reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = (select auth.uid()) AND is_moderator = true
    )
  );

CREATE POLICY "Moderators can delete reports"
  ON reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = (select auth.uid()) AND is_moderator = true
    )
  );

-- ----- Notifications -----

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = (select auth.uid()));

-- ----- Blocked Users -----

-- SELECT: see blocks in either direction involving you (fixed in 007)
CREATE POLICY "Users can view blocks involving them"
  ON blocked_users FOR SELECT
  USING (blocker_id = (select auth.uid()) OR blocked_id = (select auth.uid()));

CREATE POLICY "Users can block others"
  ON blocked_users FOR INSERT
  WITH CHECK (blocker_id = (select auth.uid()));

CREATE POLICY "Users can unblock"
  ON blocked_users FOR DELETE
  USING (blocker_id = (select auth.uid()));

-- ----- Post Likes -----

CREATE POLICY "Anyone can view likes"
  ON post_likes FOR SELECT
  USING (true);

CREATE POLICY "Level 1+ users can like posts"
  ON post_likes FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id AND
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND trust_level >= 1 AND is_banned = false)
  );

CREATE POLICY "Users can unlike their own likes"
  ON post_likes FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ----- Post Comments -----

CREATE POLICY "Anyone can view non-deleted comments"
  ON post_comments FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "Level 1+ users can comment"
  ON post_comments FOR INSERT
  WITH CHECK (
    (select auth.uid()) = author_id AND
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND trust_level >= 1 AND is_banned = false)
  );

CREATE POLICY "Users and moderators can update comments"
  ON post_comments FOR UPDATE
  USING (
    (select auth.uid()) = author_id
    OR EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND is_moderator = true)
  )
  WITH CHECK (
    (select auth.uid()) = author_id
    OR EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND is_moderator = true)
  );

CREATE POLICY "Moderators can delete comments"
  ON post_comments FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND is_moderator = true)
  );

-- ----- User Saved Locations -----

CREATE POLICY "Users can view own saved locations"
  ON user_saved_locations FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own saved locations"
  ON user_saved_locations FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own saved locations"
  ON user_saved_locations FOR UPDATE
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own saved locations"
  ON user_saved_locations FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ----- Tags -----

CREATE POLICY "Tags are viewable by everyone"
  ON tags FOR SELECT
  USING (true);

CREATE POLICY "Only moderators can insert tags"
  ON tags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND is_moderator = true));

CREATE POLICY "Only moderators can update tags"
  ON tags FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND is_moderator = true))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND is_moderator = true));

CREATE POLICY "Only moderators can delete tags"
  ON tags FOR DELETE
  USING (EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND is_moderator = true));

-- ----- Post Tags -----

CREATE POLICY "Post tags are viewable by everyone"
  ON post_tags FOR SELECT
  USING (true);

CREATE POLICY "Post authors can manage tags"
  ON post_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts WHERE id = post_id AND author_id = (select auth.uid())
    )
  );

CREATE POLICY "Post authors can delete tags"
  ON post_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts WHERE id = post_id AND author_id = (select auth.uid())
    )
  );

-- =====================================================
-- REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE tags;
ALTER PUBLICATION supabase_realtime ADD TABLE post_tags;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE metro_areas IS 'US Census metro areas';
COMMENT ON TABLE metro_area_zipcodes IS 'ZIP codes for metro areas';
COMMENT ON TABLE users IS 'User profiles and account data';
COMMENT ON TABLE posts IS 'Community posts with tag-based categorization';
COMMENT ON TABLE conversations IS 'Chat conversations';
COMMENT ON TABLE conversation_participants IS 'Conversation participant junction table';
COMMENT ON TABLE messages IS 'Chat messages';
COMMENT ON TABLE reports IS 'Content reports from users';
COMMENT ON TABLE notifications IS 'Push notification records';
COMMENT ON TABLE blocked_users IS 'User block list for chat safety';
COMMENT ON TABLE post_likes IS 'Tracks individual likes on posts for social engagement';
COMMENT ON TABLE post_comments IS 'Public comment threads on posts';
COMMENT ON TABLE user_saved_locations IS 'User saved metro locations (max 5 per user)';
COMMENT ON TABLE tags IS 'System and user-defined tags for post categorization';
COMMENT ON TABLE post_tags IS 'Many-to-many junction between posts and tags (max 3 per post)';
