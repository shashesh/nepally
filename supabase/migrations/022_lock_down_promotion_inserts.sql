-- 022_lock_down_promotion_inserts.sql
-- SECURITY: remove direct client INSERT access to listing_promotions.
--
-- Bug being fixed
--   Migration 020 created the "Users can create promotions for own listings"
--   INSERT policy on listing_promotions. It only constrained user_id,
--   listing ownership, and trust_level — it did NOT constrain status,
--   end_date, promotion_type, or the cost fields. An authenticated user
--   could INSERT a row directly (bypassing Stripe) with:
--     status       = 'active'
--     end_date     = NULL (or far-future)
--     promotion_type = 'featured_listing'
--   The AFTER INSERT trigger trg_promotion_sync_featured would then flip
--   marketplace_listings.is_featured = TRUE for free, and the sponsored_feed /
--   sticky_business read paths would surface the listing with no payment.
--
-- Fix
--   Promotions are only ever created by the create-promotion-checkout
--   Edge Function, which runs with the service role and bypasses RLS.
--   There is no legitimate client-side INSERT path, so we drop the policy
--   entirely. With RLS enabled and no INSERT policy, authenticated clients
--   cannot insert rows, while the service role continues to work.
--
-- Rollback
--   Re-create the 020 policy body if a client-side insert path is ever needed,
--   and additionally constrain status = 'pending', end_date IS NULL,
--   start_date IS NULL, and the *_cost_cents / stripe_* fields to NULL.

DROP POLICY IF EXISTS "Users can create promotions for own listings"
  ON listing_promotions;
