-- 021_fix_cascade_premium_promotion.sql
-- ADDITIVE: replaces cascade_premium_to_listings() with a version that
-- preserves is_featured when an active paid featured_listing promotion exists.
--
-- Bug being fixed
--   Migration 018 introduced cascade_premium_to_listings() which unconditionally
--   runs `SET is_featured = NEW.is_premium` for every active listing owned by
--   the user when their is_premium flag flips. That silently wipes out paid
--   featured_listing promotions the user has purchased — owner downgrades from
--   premium → free and every paid "featured" boost they bought goes dark.
--
-- Fix
--   On downgrade (premium → free) we only flip is_featured to FALSE for
--   listings that do NOT have an active featured_listing promotion in
--   listing_promotions. Upgrade (free → premium) behavior is unchanged.
--
-- Rollback
--   Replace with the 018 body of cascade_premium_to_listings().

CREATE OR REPLACE FUNCTION cascade_premium_to_listings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_premium IS DISTINCT FROM OLD.is_premium THEN
    IF NEW.is_premium THEN
      -- Upgrade: feature all active listings owned by this user.
      UPDATE marketplace_listings
        SET is_featured = TRUE
        WHERE owner_id = NEW.id AND status = 'active';
    ELSE
      -- Downgrade: only unfeature listings without an active paid featured_listing promo.
      UPDATE marketplace_listings ml
        SET is_featured = FALSE
        WHERE ml.owner_id = NEW.id
          AND ml.status = 'active'
          AND NOT EXISTS (
            SELECT 1
            FROM listing_promotions lp
            WHERE lp.listing_id = ml.id
              AND lp.promotion_type = 'featured_listing'
              AND lp.status = 'active'
              AND (lp.end_date IS NULL OR lp.end_date > now())
          );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
