-- NUSA Storage Configuration
-- Supabase Storage buckets and RLS policies.
-- Separate from schema because it targets the storage subsystem.

-- =====================================================
-- Avatars Bucket
-- =====================================================

-- Public bucket for user profile photos
-- Naming convention: avatars/{userId}.jpg (upsert overwrites previous)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Anyone can read avatar files (public bucket)
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- RLS: Authenticated users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IS NULL
    AND name = auth.uid()::text || '.jpg'
  );

-- RLS: Users can update (overwrite) their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND name = auth.uid()::text || '.jpg'
  );

-- RLS: Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND name = auth.uid()::text || '.jpg'
  );

-- =====================================================
-- Post Photos Bucket
-- =====================================================

-- Public bucket for post photos
-- Naming convention: post-photos/{userId}/{timestamp-random-filename}.jpg
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-photos', 'post-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Anyone can read post photos (public content)
CREATE POLICY "Anyone can view post photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-photos');

-- RLS: Authenticated users can upload into their own folder
CREATE POLICY "Users can upload own post photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: Authenticated users can update files in their own folder
CREATE POLICY "Users can update own post photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'post-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: Authenticated users can delete files in their own folder
CREATE POLICY "Users can delete own post photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
