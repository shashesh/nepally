-- 015_listing_photos_storage.sql
-- Storage bucket for marketplace listing photos
-- Additive migration — mirrors post-photos pattern from 003_storage.sql

-- Public bucket for listing photos
-- Naming convention: listing-photos/{userId}/{timestamp-random-filename}.jpg
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-photos', 'listing-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Anyone can read listing photos (public content)
CREATE POLICY "Anyone can view listing photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-photos');

-- RLS: Authenticated users can upload into their own folder
CREATE POLICY "Users can upload own listing photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: Authenticated users can update files in their own folder
CREATE POLICY "Users can update own listing photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'listing-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: Authenticated users can delete files in their own folder
CREATE POLICY "Users can delete own listing photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
