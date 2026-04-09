-- 018_marketplace_featured_and_trending.sql
-- ADDITIVE: adds is_featured, trending_score, triggers, indexes.
--
-- Purpose
--   Support the marketplace UX redesign (Featured / Recently Added / Trending strips)
--   and auto-feature premium-user listings so we don't need manual intervention.
--
-- Rollback notes
--   To roll back, write migration 019 that: drops the triggers, drops the indexes,
--   drops the trending_score column, and sets is_featured = FALSE on all rows.
--   Do NOT drop is_featured — keeping the column preserves data on re-roll-forward.

-- 1. Featured flag
ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Trending score as generated column (Postgres 12+; Supabase uses 15+)
ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS trending_score INTEGER
    GENERATED ALWAYS AS (views_count + saves_count * 3 + contacts_count * 5) STORED;

-- 3. Partial indexes for featured + trending queries
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_featured
  ON marketplace_listings (refreshed_at DESC)
  WHERE status = 'active' AND is_featured = TRUE;

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_trending
  ON marketplace_listings (trending_score DESC, refreshed_at DESC)
  WHERE status = 'active';

-- 4. Auto-feature trigger: set is_featured when owner is premium (INSERT or owner_id change)
-- Note: is_featured is sticky once set. Reactivation of an inactive listing
-- preserves the flag. Non-premium paid-promote flow (future) will set is_featured
-- via a separate RPC (promote_listing) + payment gate.
CREATE OR REPLACE FUNCTION set_is_featured_from_premium()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = NEW.owner_id AND is_premium = TRUE) THEN
    NEW.is_featured := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_listing_auto_feature
  BEFORE INSERT OR UPDATE OF owner_id ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION set_is_featured_from_premium();

-- 5. Cascade trigger: when users.is_premium flips, update their active listings.
-- Uses UPDATE OF is_premium + IS DISTINCT FROM guard to only fire on actual changes.
CREATE OR REPLACE FUNCTION cascade_premium_to_listings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_premium IS DISTINCT FROM OLD.is_premium THEN
    UPDATE marketplace_listings
      SET is_featured = NEW.is_premium
      WHERE owner_id = NEW.id AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_premium_cascade
  AFTER UPDATE OF is_premium ON users
  FOR EACH ROW
  EXECUTE FUNCTION cascade_premium_to_listings();

-- 6. Backfill existing premium-owned active listings
UPDATE marketplace_listings
  SET is_featured = TRUE
  WHERE owner_id IN (SELECT id FROM users WHERE is_premium = TRUE)
    AND status = 'active'
    AND is_featured = FALSE;
