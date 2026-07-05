-- Follow-up details for generated quote lines and administrable BOM quantities.
ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

ALTER TABLE public.bom_template_items
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(12,4) NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS quote_items_supplier_id_idx ON public.quote_items(supplier_id);
