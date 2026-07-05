ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS parent_part_id UUID REFERENCES public.parts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS relation_kind TEXT;

ALTER TABLE public.quote_items
  DROP CONSTRAINT IF EXISTS quote_items_relation_kind_check;

ALTER TABLE public.quote_items
  ADD CONSTRAINT quote_items_relation_kind_check
  CHECK (relation_kind IS NULL OR relation_kind IN ('kit_component', 'negotiated_option', 'accessory'));

CREATE INDEX IF NOT EXISTS quote_items_parent_part_id_idx ON public.quote_items (parent_part_id);
