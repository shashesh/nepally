-- supabase/migrations/024_fix_promotions_rls_and_feed.sql
-- Additive change: second SELECT policy so all authenticated users can read
-- active promotions for display purposes (home feed, category strips, sticky rail).
--
-- Postgres ORs multiple SELECT policies on the same table, so both policies
-- coexist safely:
--   - "Users can read own promotions"  → owners can see their promotions in any status
--   - this new policy                  → all auth users can see active promotions

CREATE POLICY "All users can read active promotions for display"
  ON listing_promotions FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND (end_date IS NULL OR end_date > now())
  );
