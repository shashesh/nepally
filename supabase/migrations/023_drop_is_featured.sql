-- 023_drop_is_featured.sql
-- ADDITIVE: drops the denormalized marketplace_listings.is_featured column
-- and makes listing_promotions the single source of truth for featured status.
-- Premium users keep the free-featured perk via auto-created `premium_perk`
-- promotion rows. Reads switch to a new view marketplace_listings_view.
--
-- Rollback notes
--   To roll back, write migration 024 that: recreates is_featured column,
--   re-backfills it from the view logic, drops the view, and restores the
--   old cascade triggers from migrations 018/020/021.

-- ─── 1. New enum + source column on listing_promotions ─────────────────────

CREATE TYPE promotion_source AS ENUM ('paid', 'premium_perk');

ALTER TABLE listing_promotions
  ADD COLUMN source promotion_source NOT NULL DEFAULT 'paid';

-- ─── 2. Relax constraints for premium_perk rows ────────────────────────────

-- Drop the existing unnamed CHECK on duration_days (inline from migration 020).
-- We look it up by constraint definition and drop by its Postgres-assigned name.
-- Uses a FOR loop so multiple matching constraints would all be dropped safely.
DO $$
DECLARE
  cname TEXT;
BEGIN
  FOR cname IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'listing_promotions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%duration_days%'
  LOOP
    EXECUTE format('ALTER TABLE listing_promotions DROP CONSTRAINT %I', cname);
  END LOOP;
END $$;

ALTER TABLE listing_promotions
  ADD CONSTRAINT listing_promotions_source_shape_check CHECK (
    (source = 'paid'
      AND duration_days BETWEEN 1 AND 90)
    OR
    (source = 'premium_perk'
      AND duration_days = 0
      AND daily_cost_cents = 0
      AND total_cost_cents = 0
      AND end_date IS NULL)
  );

-- Unique partial index: at most one active/pending/cancelled premium_perk
-- featured_listing row per listing. Prevents duplicates on premium re-upgrade.
CREATE UNIQUE INDEX idx_listing_promotions_premium_perk_unique
  ON listing_promotions (listing_id)
  WHERE source = 'premium_perk' AND promotion_type = 'featured_listing';

-- ─── 3. Backfill premium_perk rows from existing is_featured state ─────────

INSERT INTO listing_promotions (
  listing_id, user_id, promotion_type, status, source,
  duration_days, daily_cost_cents, total_cost_cents,
  start_date, end_date
)
SELECT
  ml.id,
  ml.owner_id,
  'featured_listing'::promotion_type,
  'active'::promotion_status,
  'premium_perk'::promotion_source,
  0, 0, 0,
  now(),
  NULL
FROM marketplace_listings ml
JOIN users u ON u.id = ml.owner_id
WHERE ml.is_featured = TRUE
  AND u.is_premium = TRUE
  AND ml.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM listing_promotions lp
    WHERE lp.listing_id = ml.id
      AND lp.promotion_type = 'featured_listing'
      AND lp.status = 'active'
      AND (lp.end_date IS NULL OR lp.end_date > now())
  );

-- ─── 4. Drop old cascade triggers and functions ────────────────────────────

DROP TRIGGER IF EXISTS trg_listing_auto_feature ON marketplace_listings;
DROP FUNCTION IF EXISTS set_is_featured_from_premium();

DROP TRIGGER IF EXISTS trg_user_premium_cascade ON users;
DROP FUNCTION IF EXISTS cascade_premium_to_listings();

DROP TRIGGER IF EXISTS trg_promotion_sync_featured ON listing_promotions;
DROP FUNCTION IF EXISTS sync_promotion_featured();

-- ─── 5. Drop the partial index tied to is_featured ─────────────────────────

DROP INDEX IF EXISTS idx_marketplace_listings_featured;

-- ─── 6. Drop the denormalized column ───────────────────────────────────────

ALTER TABLE marketplace_listings DROP COLUMN is_featured;

-- ─── 7. New triggers driving premium_perk rows ─────────────────────────────

-- 7a. On listing insert: if owner is premium, create a premium_perk row.
CREATE OR REPLACE FUNCTION create_premium_perk_on_listing_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = NEW.owner_id AND is_premium = TRUE) THEN
    INSERT INTO listing_promotions (
      listing_id, user_id, promotion_type, status, source,
      duration_days, daily_cost_cents, total_cost_cents,
      start_date, end_date
    )
    VALUES (
      NEW.id, NEW.owner_id, 'featured_listing', 'active', 'premium_perk',
      0, 0, 0, now(), NULL
    )
    ON CONFLICT (listing_id) WHERE source = 'premium_perk' AND promotion_type = 'featured_listing'
    DO UPDATE SET status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_listing_create_premium_perk
  AFTER INSERT ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION create_premium_perk_on_listing_insert();

-- 7b. On user premium change: upgrade → create/reactivate, downgrade → cancel.
CREATE OR REPLACE FUNCTION cascade_premium_perk_promotions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_premium IS DISTINCT FROM OLD.is_premium THEN
    IF NEW.is_premium THEN
      -- Upgrade: insert or reactivate premium_perk row for every active listing.
      INSERT INTO listing_promotions (
        listing_id, user_id, promotion_type, status, source,
        duration_days, daily_cost_cents, total_cost_cents,
        start_date, end_date
      )
      SELECT ml.id, NEW.id, 'featured_listing', 'active', 'premium_perk',
             0, 0, 0, now(), NULL
      FROM marketplace_listings ml
      WHERE ml.owner_id = NEW.id AND ml.status = 'active'
      ON CONFLICT (listing_id) WHERE source = 'premium_perk' AND promotion_type = 'featured_listing'
      DO UPDATE SET status = 'active', start_date = now();
    ELSE
      -- Downgrade: cancel all premium_perk rows. Paid rows untouched.
      UPDATE listing_promotions
        SET status = 'cancelled'
        WHERE user_id = NEW.id
          AND source = 'premium_perk'
          AND status = 'active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_user_premium_cascade_perk
  AFTER UPDATE OF is_premium ON users
  FOR EACH ROW
  EXECUTE FUNCTION cascade_premium_perk_promotions();

-- ─── 8. View exposing computed is_featured ─────────────────────────────────

CREATE VIEW marketplace_listings_view AS
SELECT
  ml.*,
  EXISTS (
    SELECT 1 FROM listing_promotions lp
    WHERE lp.listing_id = ml.id
      AND lp.promotion_type = 'featured_listing'
      AND lp.status = 'active'
      AND (lp.end_date IS NULL OR lp.end_date > now())
  ) AS is_featured
FROM marketplace_listings ml;

-- Grant the view the same read permissions the base table has for PostgREST.
GRANT SELECT ON marketplace_listings_view TO anon, authenticated;

-- FK hint comments so PostgREST can embed owner + category through the view.
COMMENT ON VIEW marketplace_listings_view IS
  E'@graphql({"primary_key_columns": ["id"]})';
