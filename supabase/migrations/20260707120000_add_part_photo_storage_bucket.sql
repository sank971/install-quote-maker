INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'part-photos',
  'part-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'part photos are publicly readable'
  ) THEN
    CREATE POLICY "part photos are publicly readable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'part-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'users can upload own part photos'
  ) THEN
    CREATE POLICY "users can upload own part photos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'part-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'users can update own part photos'
  ) THEN
    CREATE POLICY "users can update own part photos"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'part-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
      WITH CHECK (bucket_id = 'part-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'users can delete own part photos'
  ) THEN
    CREATE POLICY "users can delete own part photos"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'part-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
