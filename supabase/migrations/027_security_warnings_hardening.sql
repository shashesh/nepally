-- 027_security_warnings_hardening.sql
-- Purpose:
--   Address actionable Supabase security WARNs from database linter:
--   - function_search_path_mutable (4 functions)
--   - public_bucket_allows_listing (4 public buckets)
--
-- Notes:
--   - This migration intentionally does not change Auth leaked-password protection,
--     because that is a Supabase Auth project setting (dashboard/API), not SQL DDL.
--   - `pg_net` is non-relocatable in this project (`extrelocatable=false`), so
--     `ALTER EXTENSION ... SET SCHEMA` is not supported; that warning must be
--     handled by extension reinstall / Supabase platform guidance.
--   - This migration intentionally uses DROP POLICY for security hardening.
--     Removing broad SELECT policies prevents object enumeration in public
--     buckets. Public object URL access remains available for public buckets.
--
-- Rollback strategy (forward-only):
--   - If needed, create a new migration with:
--       ALTER FUNCTION public.update_listing_updated_at() RESET search_path;
--       ALTER FUNCTION public.increment_listing_saves() RESET search_path;
--       ALTER FUNCTION public.decrement_listing_saves() RESET search_path;
--       ALTER FUNCTION public.set_event_updated_at() RESET search_path;
--       CREATE POLICY "Anyone can view avatars" ON storage.objects
--         FOR SELECT TO public USING (bucket_id = 'avatars');
--       CREATE POLICY "Anyone can view event photos" ON storage.objects
--         FOR SELECT TO public USING (bucket_id = 'event-photos');
--       CREATE POLICY "Anyone can view listing photos" ON storage.objects
--         FOR SELECT TO public USING (bucket_id = 'listing-photos');
--       CREATE POLICY "Anyone can view post photos" ON storage.objects
--         FOR SELECT TO public USING (bucket_id = 'post-photos');

-- 1) Pin function search_path so it is not role-mutable.
ALTER FUNCTION public.update_listing_updated_at() SET search_path = public;
ALTER FUNCTION public.increment_listing_saves() SET search_path = public;
ALTER FUNCTION public.decrement_listing_saves() SET search_path = public;
ALTER FUNCTION public.set_event_updated_at() SET search_path = public;

-- 2) Remove broad listing policies from public buckets.
--    Public bucket object URLs work without SELECT policy on storage.objects,
--    and these broad policies allow object enumeration.
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view event photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view listing photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view post photos" ON storage.objects;
