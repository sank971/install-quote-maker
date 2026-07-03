-- Types de pièces paramétrables et réutilisables
CREATE TABLE IF NOT EXISTS public.part_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.part_categories TO authenticated;
GRANT ALL ON public.part_categories TO service_role;
ALTER TABLE public.part_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'part_categories'
      AND policyname = 'own part_categories'
  ) THEN
    CREATE POLICY "own part_categories" ON public.part_categories
      FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;
