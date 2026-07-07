ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS is_obsolete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS replacement_part_id UUID REFERENCES public.parts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS replacement_notes TEXT;

ALTER TABLE public.parts
  DROP CONSTRAINT IF EXISTS parts_replacement_not_self;

ALTER TABLE public.parts
  ADD CONSTRAINT parts_replacement_not_self
  CHECK (replacement_part_id IS NULL OR replacement_part_id <> id);

CREATE INDEX IF NOT EXISTS parts_replacement_part_id_idx
  ON public.parts (replacement_part_id);

COMMENT ON COLUMN public.parts.is_obsolete IS
  'Indique qu’une référence ne doit plus être utilisée dans les nouveaux devis.';

COMMENT ON COLUMN public.parts.replacement_part_id IS
  'Pièce ou kit à proposer automatiquement à la place de cette référence obsolète.';
