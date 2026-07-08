-- Points relais et stocks techniciens pour les livraisons de pièces
ALTER TABLE public.storage_locations
  DROP CONSTRAINT IF EXISTS storage_locations_type_check;
ALTER TABLE public.storage_locations
  ADD CONSTRAINT storage_locations_type_check
  CHECK (type IN ('agence','depot','vehicule_technicien','point_relais','site','autre'));

ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS relay_location_id UUID REFERENCES public.storage_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stock_location_id UUID REFERENCES public.storage_locations(id) ON DELETE SET NULL;

ALTER TABLE public.quote_items
  DROP CONSTRAINT IF EXISTS quote_items_stock_usage_check;
ALTER TABLE public.quote_items
  ADD CONSTRAINT quote_items_stock_usage_check
  CHECK (stock_usage IN ('billable_repair','use_site_stock','replenish_site_stock','use_technician_stock','replenish_technician_stock','direct_site_delivery','audit_service'));

COMMENT ON COLUMN public.subcontractors.relay_location_id IS
  'Point relais privilégié pour livrer les pièces destinées au sous-traitant ou technicien.';
COMMENT ON COLUMN public.subcontractors.stock_location_id IS
  'Lieu de stockage représentant le stock dédié du sous-traitant ou technicien.';
COMMENT ON COLUMN public.quote_items.stock_usage IS
  'billable_repair=facturé/commandé, use_site_stock=pièce consommée depuis stock site, replenish_site_stock=réassort stock site, use_technician_stock=pièce consommée du stock technicien, replenish_technician_stock=réassort stock technicien vers point relais, direct_site_delivery=livraison directe chantier, audit_service=contrôle/levée de réserve.';

CREATE INDEX IF NOT EXISTS subcontractors_relay_location_idx ON public.subcontractors(relay_location_id);
CREATE INDEX IF NOT EXISTS subcontractors_stock_location_idx ON public.subcontractors(stock_location_id);
