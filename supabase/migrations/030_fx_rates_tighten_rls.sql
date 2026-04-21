-- 030_fx_rates_tighten_rls.sql
-- ADDITIVE: tightens fx_rates RLS write policies introduced in 029.
-- The previous policies allowed any authenticated user to INSERT/UPDATE any
-- row with any pair/source/rate — a tampering risk for the shared cache.
--
-- This migration replaces the broad policies with integrity-checked versions:
--   - pair must be 'USD_NPR'
--   - source must be 'open.er-api.com'
--   - rate must be positive and finite (bounded by sanity ceiling)
--
-- Lazy-refresh from any authenticated client is still allowed, but the data
-- it writes is now constrained to values the shared API actually produces.

DROP POLICY IF EXISTS "fx_rates_insert_any_authed" ON fx_rates;
DROP POLICY IF EXISTS "fx_rates_update_any_authed" ON fx_rates;

CREATE POLICY "fx_rates_insert_valid_authed"
  ON fx_rates
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND pair = 'USD_NPR'
    AND source = 'open.er-api.com'
    AND rate > 0
    AND rate < 100000
  );

CREATE POLICY "fx_rates_update_valid_authed"
  ON fx_rates
  FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK (
    pair = 'USD_NPR'
    AND source = 'open.er-api.com'
    AND rate > 0
    AND rate < 100000
  );
