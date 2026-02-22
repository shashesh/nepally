-- 006: Avatars Storage Bucket
-- Public bucket for user profile photos
-- Naming convention: avatars/{userId}.jpg (upsert overwrites previous)

-- Create the avatars bucket (public so images can be loaded without auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Anyone can read avatar files (public bucket)
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- RLS: Authenticated users can upload their own avatar
-- File path must be {userId}.jpg
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
