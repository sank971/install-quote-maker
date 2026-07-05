ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS length_meters numeric(10,2),
  ADD COLUMN IF NOT EXISTS width_meters numeric(10,2),
  ADD COLUMN IF NOT EXISTS weight_kg numeric(10,2),
  ADD CONSTRAINT parts_length_meters_non_negative CHECK (length_meters IS NULL OR length_meters >= 0),
  ADD CONSTRAINT parts_width_meters_non_negative CHECK (width_meters IS NULL OR width_meters >= 0),
  ADD CONSTRAINT parts_weight_kg_non_negative CHECK (weight_kg IS NULL OR weight_kg >= 0);

ALTER TABLE public.installation_parts
  ADD COLUMN IF NOT EXISTS width_meters numeric(10,2),
  ADD COLUMN IF NOT EXISTS weight_kg numeric(10,2),
  ADD CONSTRAINT installation_parts_width_meters_non_negative CHECK (width_meters IS NULL OR width_meters >= 0),
  ADD CONSTRAINT installation_parts_weight_kg_non_negative CHECK (weight_kg IS NULL OR weight_kg >= 0);

ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS length_meters numeric(10,2),
  ADD COLUMN IF NOT EXISTS width_meters numeric(10,2),
  ADD COLUMN IF NOT EXISTS weight_kg numeric(10,2),
  ADD CONSTRAINT quote_items_length_meters_non_negative CHECK (length_meters IS NULL OR length_meters >= 0),
  ADD CONSTRAINT quote_items_width_meters_non_negative CHECK (width_meters IS NULL OR width_meters >= 0),
  ADD CONSTRAINT quote_items_weight_kg_non_negative CHECK (weight_kg IS NULL OR weight_kg >= 0);

COMMENT ON COLUMN public.quote_items.length_meters IS
  'Longueur unitaire utilisée pour chiffrer une pièce au mètre linéaire en plus de la quantité.';
