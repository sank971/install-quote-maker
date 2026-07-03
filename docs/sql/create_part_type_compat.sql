-- SQL à exécuter dans Supabase pour créer la table de compatibilité
-- entre les pièces et les types d'installation.
-- La table est idempotente : elle peut être relancée sans recréer la table
-- ni dupliquer la policy RLS.

CREATE TABLE IF NOT EXISTS public.part_type_compat (
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES public.installation_types(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  PRIMARY KEY (part_id, type_id)
);

CREATE INDEX IF NOT EXISTS part_type_compat_type_id_idx
  ON public.part_type_compat (type_id);

CREATE INDEX IF NOT EXISTS part_type_compat_owner_id_idx
  ON public.part_type_compat (owner_id);

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
