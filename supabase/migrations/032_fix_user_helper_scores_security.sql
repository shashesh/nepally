-- 032_fix_user_helper_scores_security.sql
-- Purpose:
--   Resolve the Supabase linter SECURITY DEFINER error on
--   public.user_helper_scores. The view was originally created in 031
--   without WITH (security_invoker = true); a later edit to 031 added the
--   clause to the source, but since 031 had already been applied,
--   CREATE OR REPLACE never re-ran against the live database.
--
-- This forward-only migration realigns the deployed view with the source
-- intent, matching the hardening pattern from 026_fix_security_definer_views.
--
-- Rollback: write a new forward migration that runs
--   ALTER VIEW public.user_helper_scores SET (security_invoker = false);

ALTER VIEW public.user_helper_scores
  SET (security_invoker = true);
