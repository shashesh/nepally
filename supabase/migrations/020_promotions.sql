-- 020_promotions.sql
-- Listing Promotions: paid visibility boosts for marketplace listings (Featured, Sponsored Feed, Sticky Business)

-- ─── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE promotion_type AS ENUM ('featured_listing', 'sponsored_feed', 'sticky_business');
CREATE TYPE promotion_status AS ENUM ('pending', 'active', 'expired', 'cancelled');

-- ─── Table ──────────────────────────────────────────────────────────────────

CREATE TABLE listing_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  promotion_type promotion_type NOT NULL,
  status promotion_status NOT NULL DEFAULT 'pending',
  duration_days INTEGER NOT NULL CHECK (duration_days >= 1 AND duration_days <= 90),
  daily_cost_cents INTEGER NOT NULL,
  total_cost_cents INTEGER NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  views_at_start INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX idx_promotions_listing_active
  ON listing_promotions (listing_id, promotion_type)
  WHERE status = 'active';

CREATE INDEX idx_promotions_expiration
  ON listing_promotions (end_date)
  WHERE status = 'active';

CREATE INDEX idx_promotions_user
  ON listing_promotions (user_id, created_at DESC);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE listing_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own promotions"
  ON listing_promotions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create promotions for own listings"
  ON listing_promotions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM marketplace_listings
      WHERE id = listing_id AND owner_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND trust_level >= 1
    )
  );

-- ─── Triggers ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_promotion_featured()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.promotion_type = 'featured_listing' THEN
    IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status <> 'active') THEN
      UPDATE marketplace_listings SET is_featured = TRUE WHERE id = NEW.listing_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_promotion_sync_featured
  AFTER INSERT OR UPDATE OF status ON listing_promotions
  FOR EACH ROW
  EXECUTE FUNCTION sync_promotion_featured();

CREATE TRIGGER set_promotions_updated_at
  BEFORE UPDATE ON listing_promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
