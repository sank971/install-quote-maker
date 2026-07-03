CREATE TABLE IF NOT EXISTS public.part_components (
  parent_part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  component_part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_part_id, component_part_id),
  CHECK (parent_part_id <> component_part_id)
);

CREATE INDEX IF NOT EXISTS part_components_component_part_id_idx
  ON public.part_components (component_part_id);
CREATE INDEX IF NOT EXISTS part_components_owner_id_idx
  ON public.part_components (owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.part_components TO authenticated;
GRANT ALL ON public.part_components TO service_role;

ALTER TABLE public.part_components ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'part_components'
      AND policyname = 'own part_components'
  ) THEN
    CREATE POLICY "own part_components" ON public.part_components
      FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;
