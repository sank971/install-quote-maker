ALTER TABLE public.part_components
  ADD COLUMN IF NOT EXISTS negotiated_price NUMERIC(10,2);

COMMENT ON COLUMN public.part_components.negotiated_price IS
  'Prix de vente à appliquer quand la pièce est ajoutée comme option au prix négocié d’un kit.';
