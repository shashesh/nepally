-- NUSA Initial Database Schema Migration
-- This migration creates all tables, indexes, RLS policies, and functions
-- Safe to re-run: drops all objects first (dev only — no production data)

-- =====================================================
-- TEARDOWN (drop in reverse dependency order)
-- =====================================================

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
DROP TYPE IF EXISTS post_category;

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_metro_by_zip(TEXT) CASCADE;

-- =====================================================
-- EXTENSIONS
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =====================================================
-- CUSTOM TYPES
-- =====================================================

CREATE TYPE post_category AS ENUM ('housing', 'jobs', 'emergency', 'travel');
CREATE TYPE post_status AS ENUM ('active', 'expired', 'removed', 'pending');
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
  category post_category NOT NULL,

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

  -- Category-specific fields (JSONB for flexibility)
  fields JSONB NOT NULL DEFAULT '{}',

  -- Status
  status post_status NOT NULL DEFAULT 'active',
  expiry_date TIMESTAMPTZ NOT NULL,

  -- Engagement
  views_count INTEGER NOT NULL DEFAULT 0,
  responses_count INTEGER NOT NULL DEFAULT 0,
  reports_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
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
CREATE INDEX idx_posts_metro_category_status_created
  ON posts(metro_area_id, category, status, created_at DESC);
CREATE INDEX idx_posts_metro_status_expiry
  ON posts(metro_area_id, status, expiry_date);
CREATE INDEX idx_posts_author_created
  ON posts(author_id, created_at DESC);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_expiry ON posts(expiry_date) WHERE status = 'active';
CREATE INDEX idx_posts_fields ON posts USING GIN(fields);

-- Conversations
CREATE INDEX idx_conversations_post ON conversations(post_id);
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

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
  FROM metro_areas m
  JOIN metro_area_zipcodes z ON m.id = z.metro_area_id
  WHERE z.zip_code = zip
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Users updated_at trigger
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Posts updated_at trigger
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Conversations updated_at trigger
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- Metro Areas Policies
CREATE POLICY "Metro areas are viewable by everyone"
  ON metro_areas FOR SELECT
  USING (true);

CREATE POLICY "Only service role can modify metro areas"
  ON metro_areas FOR ALL
  USING (auth.role() = 'service_role');

-- Metro ZIP Codes Policies
CREATE POLICY "Metro ZIP codes are viewable by everyone"
  ON metro_area_zipcodes FOR SELECT
  USING (true);

CREATE POLICY "Only service role can modify metro ZIP codes"
  ON metro_area_zipcodes FOR ALL
  USING (auth.role() = 'service_role');

-- Users Policies
CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Moderators can delete users"
  ON users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true
    )
  );

-- Posts Policies
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

-- Conversations Policies
CREATE POLICY "Participants can view conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Verified users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND trust_level >= 1
    )
  );

CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id AND user_id = auth.uid()
    )
  );

-- Conversation Participants Policies
CREATE POLICY "Users can view own participation"
  ON conversation_participants FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can add themselves to conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own participation"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Messages Policies
CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "Senders can update own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

CREATE POLICY "Senders can delete own messages"
  ON messages FOR DELETE
  USING (sender_id = auth.uid());

-- Reports Policies
CREATE POLICY "Moderators can view reports"
  ON reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true
    )
  );

CREATE POLICY "Verified users can create reports"
  ON reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND trust_level >= 1
    )
    AND reported_by = auth.uid()
  );

CREATE POLICY "Moderators can update reports"
  ON reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true
    )
  );

CREATE POLICY "Moderators can delete reports"
  ON reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true
    )
  );

-- Notifications Policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- =====================================================
-- REALTIME
-- =====================================================

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE users IS 'User profiles and account data';
COMMENT ON TABLE metro_areas IS 'US Census metro areas';
COMMENT ON TABLE metro_area_zipcodes IS 'ZIP codes for metro areas';
COMMENT ON TABLE posts IS 'Housing, jobs, emergency, travel posts';
COMMENT ON TABLE conversations IS 'Chat conversations';
COMMENT ON TABLE conversation_participants IS 'Conversation participant junction table';
COMMENT ON TABLE messages IS 'Chat messages';
COMMENT ON TABLE reports IS 'Content reports from users';
COMMENT ON TABLE notifications IS 'Push notification records';
