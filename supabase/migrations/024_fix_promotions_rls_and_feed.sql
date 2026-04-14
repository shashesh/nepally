-- supabase/migrations/024_fix_promotions_rls_and_feed.sql
-- Expose active promotions for display (home feed, category strips, sticky
-- business rail) WITHOUT broadening RLS on listing_promotions itself.
--
-- listing_promotions holds payment identifiers (stripe_checkout_session_id,
-- stripe_payment_intent_id) and cost fields (daily_cost_cents,
-- total_cost_cents) that must stay private to the owner. The owner-only
-- SELECT policy from 020_promotions.sql remains the only RLS policy on the
-- base table.
--
-- This migration creates a view that exposes ONLY display-safe columns and
-- is filtered to active, unexpired promotions. The view runs with its
-- creator's privileges (security_invoker = off, the default), so it
-- bypasses RLS on the base table in a controlled way — the column list is
-- the security boundary.

CREATE VIEW listing_promotions_display AS
SELECT
  id,
  listing_id,
  promotion_type,
  status,
  start_date,
  end_date,
  created_at
FROM listing_promotions
WHERE status = 'active'
  AND (end_date IS NULL OR end_date > now());

GRANT SELECT ON listing_promotions_display TO authenticated, anon;

COMMENT ON VIEW listing_promotions_display IS
  'Display-safe projection of active listing_promotions for feed/strip reads. '
  'Excludes stripe_* payment identifiers and cost fields. '
  'Use this view — not listing_promotions — for any query that is not scoped '
  'to the promotion owner.';
