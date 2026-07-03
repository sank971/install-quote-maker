-- Compatibilité pièce <-> type d'installation (M:N)
CREATE TABLE IF NOT EXISTS public.part_type_compat (
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES public.installation_types(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  PRIMARY KEY (part_id, type_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.part_type_compat TO authenticated;
GRANT ALL ON public.part_type_compat TO service_role;

ALTER TABLE public.part_type_compat ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'part_type_compat'
      AND policyname = 'own part_type_compat'
  ) THEN
    CREATE POLICY "own part_type_compat" ON public.part_type_compat
      FOR ALL TO authenticated
      USING (auth.uid() = owner_id)
      WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;
