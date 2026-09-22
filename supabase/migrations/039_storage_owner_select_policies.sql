-- 039_storage_owner_select_policies.sql
-- ADDITIVE / non-destructive. Lets a signed-in member SELECT their own objects
-- in each storage bucket, so photo deletes and avatar replacement work again.
--
--   Problem: 027 dropped the only SELECT policies on storage.objects ("Anyone
--   can view avatars" / event photos / listing photos / post photos) to stop
--   anyone listing a public bucket. Nothing replaced them. Public object URLs
--   never needed them, because the storage API serves a public bucket's files
--   without consulting RLS. Two write paths do read the row under RLS, though:
--
--     - remove(): Supabase documents it as needing SELECT and DELETE on
--       storage.objects. Postgres applies SELECT policies to a DELETE that
--       reads the row it deletes, and a row the caller cannot SELECT is
--       invisible. The DELETE matched zero rows and remove() still reported
--       success, with no error. The file stayed in the bucket and stayed
--       reachable at its public URL. Today's callers are deleteProfilePhoto
--       (removing an avatar) and deletePostPhotos (photos dropped from an
--       edited post, and uploads cleaned up after a failed submit).
--       deleteListingPhotos has no caller yet, and event photos have no delete
--       path. Those buckets get the same policy so a future delete works.
--     - upload() with upsert: true over an existing object: Supabase documents
--       overwriting as needing SELECT and UPDATE as well as INSERT.
--       uploadProfilePhoto upserts <uid>.jpg, so replacing an existing avatar
--       is expected to fail as well.
--
--   Fix: one SELECT policy per bucket. Each covers exactly the rows the
--   member's existing UPDATE/DELETE policy on that bucket already covers:
--     - avatars: name = '<uid>.jpg'
--     - post-photos, listing-photos, event-photos: first folder = '<uid>'
--   The predicates repeat the INSERT/UPDATE/DELETE policies from 003, 006 and
--   015: auth.role() = 'authenticated' plus the ownership test, and no TO
--   clause (roles {public}). auth.uid() and auth.role() are wrapped as
--   (select ...) so Postgres evaluates them once per statement instead of once
--   per row, the convention 033 applied to the public-schema policies. The
--   value is the same.
--
--   Enumeration stays closed. anon matches no rows, and a member can list only
--   their own objects. Do NOT re-add a broad USING (bucket_id = '<bucket>')
--   SELECT policy: that is what 027 removed (Supabase lint
--   public_bucket_allows_listing). The lint flags only SELECT policies whose
--   qual is empty or just the bucket_id test, so these owner-scoped policies
--   do not trip it.
--
-- Uses DROP POLICY IF EXISTS on the new names only, so re-running is harmless.
--
-- Rollback (forward-only): a new migration that drops these four policies.
--   That brings back the silent no-op deletes, so it is not recommended.

-- avatars: <uid>.jpg at the bucket root (003_storage.sql)
DROP POLICY IF EXISTS "Users can view own avatar" ON storage.objects;
CREATE POLICY "Users can view own avatar"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND (select auth.role()) = 'authenticated'
    AND name = (select auth.uid())::text || '.jpg'
  );

-- post-photos: <uid>/<file> (003_storage.sql)
DROP POLICY IF EXISTS "Users can view own post photos" ON storage.objects;
CREATE POLICY "Users can view own post photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'post-photos'
    AND (select auth.role()) = 'authenticated'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- event-photos: <uid>/<file> (006_events.sql)
DROP POLICY IF EXISTS "Users can view own event photos" ON storage.objects;
CREATE POLICY "Users can view own event photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'event-photos'
    AND (select auth.role()) = 'authenticated'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- listing-photos: <uid>/<file> (015_listing_photos_storage.sql)
DROP POLICY IF EXISTS "Users can view own listing photos" ON storage.objects;
CREATE POLICY "Users can view own listing photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'listing-photos'
    AND (select auth.role()) = 'authenticated'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );
