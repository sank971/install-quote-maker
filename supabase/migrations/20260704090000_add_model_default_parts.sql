CREATE TABLE IF NOT EXISTS public.model_default_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (model_id, part_id)
);

CREATE INDEX IF NOT EXISTS model_default_parts_model_id_idx
  ON public.model_default_parts (model_id);
CREATE INDEX IF NOT EXISTS model_default_parts_part_id_idx
  ON public.model_default_parts (part_id);
CREATE INDEX IF NOT EXISTS model_default_parts_owner_id_idx
  ON public.model_default_parts (owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_default_parts TO authenticated;
GRANT ALL ON public.model_default_parts TO service_role;

ALTER TABLE public.model_default_parts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'model_default_parts'
      AND policyname = 'own model_default_parts'
  ) THEN
    CREATE POLICY "own model_default_parts" ON public.model_default_parts
      FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;
