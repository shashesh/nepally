-- Migration: User Saved Locations
-- Supports dynamic location management (up to 5 saved locations per user)

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

-- Index for fast lookup by user
CREATE INDEX idx_user_saved_locations_user ON user_saved_locations(user_id);

-- Enforce max 5 saved locations per user via trigger
CREATE OR REPLACE FUNCTION check_max_saved_locations()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM user_saved_locations WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 saved locations per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_saved_locations
  BEFORE INSERT ON user_saved_locations
  FOR EACH ROW
  EXECUTE FUNCTION check_max_saved_locations();

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_saved_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_saved_location_updated_at
  BEFORE UPDATE ON user_saved_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_location_timestamp();

-- Row Level Security
ALTER TABLE user_saved_locations ENABLE ROW LEVEL SECURITY;

-- Users can read their own saved locations
CREATE POLICY "Users can view own saved locations"
  ON user_saved_locations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own saved locations
CREATE POLICY "Users can insert own saved locations"
  ON user_saved_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved locations
CREATE POLICY "Users can update own saved locations"
  ON user_saved_locations FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own saved locations
CREATE POLICY "Users can delete own saved locations"
  ON user_saved_locations FOR DELETE
  USING (auth.uid() = user_id);

-- Seed: Migrate existing users' metro_area_id as "Home" default
INSERT INTO user_saved_locations (user_id, metro_area_id, label, zip_code, is_default, sort_order)
SELECT
  id AS user_id,
  metro_area_id,
  'Home' AS label,
  zip_code,
  true AS is_default,
  0 AS sort_order
FROM users
WHERE metro_area_id IS NOT NULL;
