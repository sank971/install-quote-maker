CREATE TABLE IF NOT EXISTS public.installation_parts (
  installation_id UUID NOT NULL REFERENCES public.installations(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (installation_id, part_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.installation_parts TO authenticated;
GRANT ALL ON public.installation_parts TO service_role;

ALTER TABLE public.installation_parts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'installation_parts'
      AND policyname = 'own installation_parts'
  ) THEN
    CREATE POLICY "own installation_parts" ON public.installation_parts
      FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS installation_parts_part_id_idx ON public.installation_parts (part_id);
