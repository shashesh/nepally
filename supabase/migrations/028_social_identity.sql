-- 028_social_identity.sql
-- ADDITIVE: extended profile columns + one-directional follow graph.
-- See docs/specs/2026-04-20-your-community-today-design.md
--
-- Rollback: write a new forward-only migration that:
--   DROP TRIGGER IF EXISTS user_follows_after_insert ON user_follows;
--   DROP TRIGGER IF EXISTS user_follows_after_delete ON user_follows;
--   DROP TRIGGER IF EXISTS user_blocks_sever_follows ON user_blocks;
--   DROP TABLE IF EXISTS user_follows;
--   ALTER TABLE users
--     DROP COLUMN IF EXISTS hometown_district,
--     DROP COLUMN IF EXISTS college,
--     DROP COLUMN IF EXISTS years_in_us,
--     DROP COLUMN IF EXISTS languages,
--     DROP COLUMN IF EXISTS follower_count,
--     DROP COLUMN IF EXISTS following_count;

-- 1) Extended profile columns (all optional, all NULLable)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS hometown_district text,
  ADD COLUMN IF NOT EXISTS college text,
  ADD COLUMN IF NOT EXISTS years_in_us smallint,
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS follower_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count integer NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD CONSTRAINT users_college_length_check
    CHECK (college IS NULL OR CHAR_LENGTH(college) <= 100),
  ADD CONSTRAINT users_years_in_us_range_check
    CHECK (years_in_us IS NULL OR (years_in_us >= 0 AND years_in_us <= 99)),
  ADD CONSTRAINT users_follower_count_nonneg CHECK (follower_count >= 0),
  ADD CONSTRAINT users_following_count_nonneg CHECK (following_count >= 0);

COMMENT ON COLUMN users.hometown_district IS
  'One of 77 Nepal districts. Validated in shared/validation/user.ts.';
COMMENT ON COLUMN users.college IS
  'Free-text college/university. Max 100 chars.';
COMMENT ON COLUMN users.years_in_us IS
  'Years the user has lived in the US. Display only.';
COMMENT ON COLUMN users.languages IS
  'Array of language codes. Validated in shared/validation/user.ts.';
COMMENT ON COLUMN users.follower_count IS
  'Denormalized count maintained by user_follows triggers.';
COMMENT ON COLUMN users.following_count IS
  'Denormalized count maintained by user_follows triggers.';

-- 2) user_follows table
CREATE TABLE IF NOT EXISTS user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_followee ON user_follows (followee_id);

COMMENT ON TABLE user_follows IS
  'One-directional follow graph. See docs/specs/2026-04-20-your-community-today-design.md';

-- 3) Counter triggers
CREATE OR REPLACE FUNCTION bump_follow_counts_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  UPDATE users SET follower_count = follower_count + 1 WHERE id = NEW.followee_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION bump_follow_counts_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
  UPDATE users SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.followee_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS user_follows_after_insert ON user_follows;
CREATE TRIGGER user_follows_after_insert
  AFTER INSERT ON user_follows
  FOR EACH ROW EXECUTE FUNCTION bump_follow_counts_on_insert();

DROP TRIGGER IF EXISTS user_follows_after_delete ON user_follows;
CREATE TRIGGER user_follows_after_delete
  AFTER DELETE ON user_follows
  FOR EACH ROW EXECUTE FUNCTION bump_follow_counts_on_delete();

-- 4) RLS
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_follows_select_all"
  ON user_follows
  FOR SELECT
  USING (true);

CREATE POLICY "user_follows_insert_self_verified"
  ON user_follows
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = follower_id
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
        AND trust_level >= 1
        AND is_banned = false
    )
  );

CREATE POLICY "user_follows_delete_self_or_mod"
  ON user_follows
  FOR DELETE
  USING (
    (SELECT auth.uid()) = follower_id
    OR EXISTS (
      SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND is_moderator = true
    )
  );

-- 5) Block-severs-follow trigger.
CREATE OR REPLACE FUNCTION sever_follows_on_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM user_follows
   WHERE (follower_id = NEW.blocker_id AND followee_id = NEW.blocked_id)
      OR (follower_id = NEW.blocked_id AND followee_id = NEW.blocker_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_blocks_sever_follows ON user_blocks;
CREATE TRIGGER user_blocks_sever_follows
  AFTER INSERT ON user_blocks
  FOR EACH ROW EXECUTE FUNCTION sever_follows_on_block();
