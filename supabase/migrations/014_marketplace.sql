-- 014_marketplace.sql
-- Marketplace feature: categories, listings, saved listings
-- Additive migration — no DROP statements

-- ─── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE listing_type AS ENUM ('business', 'individual');
CREATE TYPE listing_status AS ENUM ('active', 'inactive', 'removed');
CREATE TYPE item_condition AS ENUM ('new', 'used');

-- Extend existing report_target_type to include listings
ALTER TYPE report_target_type ADD VALUE IF NOT EXISTS 'listing';

-- ─── Marketplace Categories (seeded reference table) ────────────────────────

CREATE TABLE marketplace_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  emoji TEXT,
  icon TEXT,
  color TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE marketplace_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read categories"
  ON marketplace_categories FOR SELECT
  TO authenticated
  USING (true);

-- ─── Marketplace Listings ───────────────────────────────────────────────────

CREATE TABLE marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metro_area_id TEXT NOT NULL REFERENCES metro_areas(id),
  category_id UUID NOT NULL REFERENCES marketplace_categories(id),
  listing_type listing_type NOT NULL,
  status listing_status NOT NULL DEFAULT 'active',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  photos TEXT[] DEFAULT '{}',
  price TEXT,
  -- Business-specific fields
  business_name TEXT,
  address TEXT,
  business_hours JSONB,
  -- Individual-specific fields
  item_condition item_condition,
  -- Contact info (shared)
  phone TEXT,
  email TEXT,
  website_url TEXT,
  -- Future: Phase 3 multi-metro/global
  is_global BOOLEAN DEFAULT false,
  -- Engagement counters
  views_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  contacts_count INTEGER DEFAULT 0,
  -- Soft expiry: deprioritize after 90 days without refresh
  refreshed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active listings
CREATE POLICY "Anyone can read active listings"
  ON marketplace_listings FOR SELECT
  TO authenticated
  USING (status = 'active' OR owner_id = auth.uid());

-- Trust level >= 1 can create listings (owner_id must be self)
CREATE POLICY "Verified users can create listings"
  ON marketplace_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND trust_level >= 1
    )
  );

-- Only owner can update their listings
CREATE POLICY "Owners can update their listings"
  ON marketplace_listings FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Only owner can delete their listings
CREATE POLICY "Owners can delete their listings"
  ON marketplace_listings FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ─── Saved Listings (bookmarks) ─────────────────────────────────────────────

CREATE TABLE saved_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own saved listings"
  ON saved_listings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can save listings"
  ON saved_listings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unsave listings"
  ON saved_listings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ─── Indexes ────────────────────────────────────────────────────────────────

-- Primary feed query: active listings in a metro area, ordered by freshness
CREATE INDEX idx_listings_metro_status_refreshed
  ON marketplace_listings(metro_area_id, status, refreshed_at DESC);

-- Category filtering
CREATE INDEX idx_listings_category
  ON marketplace_listings(category_id)
  WHERE status = 'active';

-- Owner's listings (My Listings)
CREATE INDEX idx_listings_owner
  ON marketplace_listings(owner_id);

-- Soft expiry: find stale listings
CREATE INDEX idx_listings_refreshed
  ON marketplace_listings(refreshed_at)
  WHERE status = 'active';

-- Global listings (Phase 3)
CREATE INDEX idx_listings_global
  ON marketplace_listings(is_global)
  WHERE is_global = true AND status = 'active';

-- Saved listings by user
CREATE INDEX idx_saved_listings_user
  ON saved_listings(user_id);

-- Full-text search on title + description
CREATE INDEX idx_listings_search
  ON marketplace_listings
  USING GIN (to_tsvector('english', title || ' ' || coalesce(description, '')));

-- ─── Triggers ───────────────────────────────────────────────────────────────

-- Auto-update updated_at on marketplace_listings
CREATE OR REPLACE FUNCTION update_listing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_listing_updated_at
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_updated_at();

-- Increment saves_count when a listing is saved
CREATE OR REPLACE FUNCTION increment_listing_saves()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_listings
  SET saves_count = saves_count + 1
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_listing_saves
  AFTER INSERT ON saved_listings
  FOR EACH ROW
  EXECUTE FUNCTION increment_listing_saves();

-- Decrement saves_count when a listing is unsaved
CREATE OR REPLACE FUNCTION decrement_listing_saves()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_listings
  SET saves_count = GREATEST(saves_count - 1, 0)
  WHERE id = OLD.listing_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_decrement_listing_saves
  AFTER DELETE ON saved_listings
  FOR EACH ROW
  EXECUTE FUNCTION decrement_listing_saves();

-- ─── RPC Functions (engagement counters) ────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_listing_views(p_listing_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE marketplace_listings
  SET views_count = views_count + 1
  WHERE id = p_listing_id AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_listing_contacts(p_listing_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE marketplace_listings
  SET contacts_count = contacts_count + 1
  WHERE id = p_listing_id AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Seed Data: 12 Nepali-tailored Categories ──────────────────────────────

INSERT INTO marketplace_categories (name, slug, emoji, icon, color, description, sort_order) VALUES
  ('Food & Restaurants',    'food-restaurants',    '🍜', 'restaurant',     '#FF6B35', 'Nepali restaurants, cafes, catering, tiffin services',           1),
  ('Grocery & Specialty',   'grocery-specialty',   '🛒', 'cart',           '#4CAF50', 'Nepali grocery stores, specialty ingredients, spices',            2),
  ('Professional Services', 'professional-services','💼', 'briefcase',      '#2196F3', 'Accounting, consulting, IT services, and more',                  3),
  ('Immigration & Legal',   'immigration-legal',   '⚖️', 'scale',          '#9C27B0', 'Immigration attorneys, visa help, legal consultations',           4),
  ('Remittance & Finance',  'remittance-finance',  '💸', 'cash',           '#FF9800', 'Money transfer, tax filing, financial planning',                 5),
  ('Health & Wellness',     'health-wellness',     '🏥', 'medkit',         '#E91E63', 'Clinics, therapists, wellness centers, pharmacies',              6),
  ('Education & Tutoring',  'education-tutoring',  '🎓', 'school',         '#3F51B5', 'Tutoring, test prep, language classes, training',                7),
  ('Transportation',        'transportation',      '🚗', 'car',            '#607D8B', 'Ride services, auto repair, moving help',                        8),
  ('Home Services',         'home-services',       '🏠', 'home',           '#795548', 'Cleaning, plumbing, electrical, handyman',                       9),
  ('Beauty & Wellness',     'beauty-wellness',     '💇', 'cut',            '#F06292', 'Salons, barbershops, spas, beauty services',                     10),
  ('Cultural Services',     'cultural-services',   '🎭', 'color-palette',  '#AB47BC', 'Priests, event planning, photography, traditional services',     11),
  ('Other',                 'other',               '📦', 'cube',           '#9E9E9E', 'Everything else not covered by other categories',                12);
