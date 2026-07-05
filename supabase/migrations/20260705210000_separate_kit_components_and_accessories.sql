ALTER TABLE public.part_components
  ADD COLUMN IF NOT EXISTS relation_kind TEXT NOT NULL DEFAULT 'accessory';

ALTER TABLE public.part_components
  DROP CONSTRAINT IF EXISTS part_components_relation_kind_check;

ALTER TABLE public.part_components
  ADD CONSTRAINT part_components_relation_kind_check
  CHECK (relation_kind IN ('kit_component', 'negotiated_option', 'accessory'));

COMMENT ON COLUMN public.part_components.relation_kind IS
  'Sépare les pièces qui composent réellement un kit, les options au prix négocié du kit et les accessoires facturables à l’unité.';
