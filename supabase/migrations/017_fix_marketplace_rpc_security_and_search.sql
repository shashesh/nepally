-- 017_fix_marketplace_rpc_security_and_search.sql
-- 1. Harden SECURITY DEFINER RPCs: set safe search_path, revoke PUBLIC, grant authenticated
-- 2. Add generated search_vector column for proper full-text search on title + description
-- Additive migration — no DROP TABLE / DROP TYPE

-- ─── Fix: increment_listing_views ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_listing_views(p_listing_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.marketplace_listings
  SET views_count = views_count + 1
  WHERE id = p_listing_id AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION increment_listing_views(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_listing_views(UUID) TO authenticated;

-- ─── Fix: increment_listing_contacts ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_listing_contacts(p_listing_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.marketplace_listings
  SET contacts_count = contacts_count + 1
  WHERE id = p_listing_id AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION increment_listing_contacts(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_listing_contacts(UUID) TO authenticated;

-- ─── Full-text search: generated tsvector column ─────────────────────────────
-- Replaces the expression-based GIN index with a stored generated column so
-- Supabase PostgREST textSearch('search_vector', ...) hits the index correctly.

ALTER TABLE marketplace_listings
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;

-- New GIN index on the generated column
CREATE INDEX idx_listings_search_vector
  ON marketplace_listings USING GIN (search_vector);

-- Drop the old expression-based index (no longer needed)
DROP INDEX IF EXISTS idx_listings_search;
