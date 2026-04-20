-- 026_fix_security_definer_views.sql
-- Purpose:
--   Resolve Supabase linter errors for SECURITY DEFINER views while preserving
--   existing marketplace/feed behavior.
--
-- Strategy:
--   1) Switch views to security_invoker = true
--   2) Add explicit, least-privilege SELECT grants on listing_promotions
--      for display-safe columns only
--   3) Add a public read policy limited to active, unexpired promotions
--
-- Rollback notes:
--   If needed, create a new forward migration to:
--   - ALTER VIEW ... SET (security_invoker = false)
--   - DROP POLICY "Public can read active promotions for display"
--   - REVOKE column-level SELECT grant from anon/authenticated

ALTER VIEW public.listing_promotions_display
  SET (security_invoker = true);

ALTER VIEW public.marketplace_listings_view
  SET (security_invoker = true);

GRANT SELECT (
  id,
  listing_id,
  promotion_type,
  status,
  start_date,
  end_date,
  created_at
)
ON public.listing_promotions
TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read active promotions for display"
  ON public.listing_promotions;

CREATE POLICY "Public can read active promotions for display"
  ON public.listing_promotions
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'::promotion_status
    AND (end_date IS NULL OR end_date > now())
  );
