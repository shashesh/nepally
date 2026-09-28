-- 045_storage_bucket_limits.sql
-- ADDITIVE / non-destructive: bucket settings only. No schema, policy or
-- object changes.
-- Gives each storage bucket a file size limit and a list of allowed MIME
-- types, so the storage API itself refuses what the apps already refuse.
--
--   Problem: all four buckets (003, 006, 015) were created with
--   file_size_limit and allowed_mime_types NULL, meaning any size and any
--   type. The size and type checks live only in the apps
--   (packages/shared/src/api/storage.ts, constants/postPhotos.ts,
--   constants/marketplace.ts). A member holding a valid session can skip the
--   apps and upload straight to the storage API: a 50MB file, or text/html
--   into a public bucket, where it is served from the project's domain.
--
--   Fix: set each bucket's limits to what its upload helper already enforces.
--     - post-photos:    5MB  (MAX_POST_PHOTO_BYTES), jpeg/jpg/png/webp
--     - listing-photos: 2MB  (MAX_LISTING_PHOTO_BYTES), jpeg/jpg/png/webp
--     - event-photos:   2MB  (uploadEventPhoto), jpeg/jpg/png/webp
--     - avatars:        1MB, jpeg only. uploadProfilePhoto always sends
--       image/jpeg, and both apps encode a 500px square JPEG
--       (PROFILE_PHOTO_SIZE_PX) first, which comes out well under 1MB.
--   image/jpg is not a registered type, but the apps accept it, so the
--   buckets do too.
--
--   The limits apply to new uploads only; existing objects are untouched.
--   On staging (2026-09-25) every existing object already fits: largest
--   1.6MB (event-photos), all image/jpeg or image/png.
--
--   Changing a limit later: update the app constant and the bucket in the
--   same PR, with a new migration.
--
-- Idempotent: the UPDATEs set fixed values and can be re-run.
--
-- Verify: npm run test:security:storage-limits against staging.
--
-- Rollback (forward-only): a new migration that sets both columns back to
-- NULL for the affected buckets.

UPDATE storage.buckets
   SET file_size_limit = 5 * 1024 * 1024,
       allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
 WHERE id = 'post-photos';

UPDATE storage.buckets
   SET file_size_limit = 2 * 1024 * 1024,
       allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
 WHERE id IN ('listing-photos', 'event-photos');

UPDATE storage.buckets
   SET file_size_limit = 1024 * 1024,
       allowed_mime_types = ARRAY['image/jpeg']
 WHERE id = 'avatars';
