-- =============================================================================
-- Migration 007: Event Photos Storage Bucket
-- Non-destructive, additive only.
-- DO NOT modify migrations 001, 002, or 003.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view event photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own event photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own event photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own event photos" ON storage.objects;

CREATE POLICY "Anyone can view event photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-photos');

CREATE POLICY "Users can upload own event photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own event photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'event-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own event photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
