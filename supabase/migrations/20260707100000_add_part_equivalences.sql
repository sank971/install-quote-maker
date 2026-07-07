CREATE TABLE IF NOT EXISTS public.part_equivalences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  source_part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  equivalent_part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_part_id <> equivalent_part_id),
  UNIQUE (owner_id, source_part_id, equivalent_part_id)
);

CREATE INDEX IF NOT EXISTS part_equivalences_source_part_id_idx
  ON public.part_equivalences (source_part_id);
CREATE INDEX IF NOT EXISTS part_equivalences_equivalent_part_id_idx
  ON public.part_equivalences (equivalent_part_id);
CREATE INDEX IF NOT EXISTS part_equivalences_owner_id_idx
  ON public.part_equivalences (owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.part_equivalences TO authenticated;
GRANT ALL ON public.part_equivalences TO service_role;

ALTER TABLE public.part_equivalences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'part_equivalences'
      AND policyname = 'own part_equivalences'
  ) THEN
    CREATE POLICY "own part_equivalences" ON public.part_equivalences
      FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;

DROP TRIGGER IF EXISTS t_part_equivalences_upd ON public.part_equivalences;
CREATE TRIGGER t_part_equivalences_upd
  BEFORE UPDATE ON public.part_equivalences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
