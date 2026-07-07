-- Stock sur site, tickets stock/réserve et lignes de devis liées au stock site
ALTER TABLE public.storage_locations
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL;

ALTER TABLE public.storage_locations
  DROP CONSTRAINT IF EXISTS storage_locations_type_check;
ALTER TABLE public.storage_locations
  ADD CONSTRAINT storage_locations_type_check
  CHECK (type IN ('agence','depot','vehicule_technicien','site','autre'));

CREATE UNIQUE INDEX IF NOT EXISTS storage_locations_one_active_site_stock_idx
  ON public.storage_locations(site_id)
  WHERE site_id IS NOT NULL AND type = 'site' AND is_active = true;

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS ticket_type TEXT NOT NULL DEFAULT 'repair',
  ADD COLUMN IF NOT EXISTS storage_location_id UUID REFERENCES public.storage_locations(id) ON DELETE SET NULL;

ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_ticket_type_check;
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_ticket_type_check
  CHECK (ticket_type IN ('repair','maintenance','site_stock_order','reserve_lift','site_stock_audit'));

ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS stock_usage TEXT NOT NULL DEFAULT 'billable_repair',
  ADD COLUMN IF NOT EXISTS storage_location_id UUID REFERENCES public.storage_locations(id) ON DELETE SET NULL;

ALTER TABLE public.quote_items
  DROP CONSTRAINT IF EXISTS quote_items_stock_usage_check;
ALTER TABLE public.quote_items
  ADD CONSTRAINT quote_items_stock_usage_check
  CHECK (stock_usage IN ('billable_repair','use_site_stock','replenish_site_stock','audit_service'));

COMMENT ON COLUMN public.quote_items.stock_usage IS
  'billable_repair=facturé/commandé, use_site_stock=pièce consommée depuis stock site non facturée, replenish_site_stock=pièce commandée pour remplir le stock site, audit_service=ligne de levée de réserve/contrôle stock.';
COMMENT ON COLUMN public.tickets.ticket_type IS
  'repair=réparation, maintenance=maintenance site, site_stock_order=commande stock site, reserve_lift=levée de réserve, site_stock_audit=contrôle stock site.';

CREATE OR REPLACE FUNCTION public.ensure_site_storage_location(p_site_id UUID, p_owner_id UUID DEFAULT auth.uid())
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE loc_id UUID; site_row RECORD;
BEGIN
  SELECT * INTO site_row FROM public.sites WHERE id = p_site_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Site introuvable'; END IF;

  SELECT id INTO loc_id
  FROM public.storage_locations
  WHERE site_id = p_site_id AND type = 'site' AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF loc_id IS NULL THEN
    INSERT INTO public.storage_locations(owner_id, site_id, name, type, address, postal_code, city, country, latitude, longitude, is_active)
    VALUES (
      COALESCE(p_owner_id, site_row.owner_id),
      p_site_id,
      'Stock site · ' || COALESCE(site_row.name, 'Site'),
      'site',
      COALESCE(site_row.address, 'Adresse site à compléter'),
      null,
      null,
      'France',
      null,
      null,
      true
    )
    RETURNING id INTO loc_id;
  END IF;

  RETURN loc_id;
END $$;


CREATE OR REPLACE FUNCTION public.consume_site_stock_from_quote_item(p_quote_item_id UUID, p_actor UUID DEFAULT auth.uid())
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item RECORD; quote_row RECORD; loc_id UUID; qty NUMERIC; stock RECORD;
BEGIN
  SELECT * INTO item FROM public.quote_items WHERE id = p_quote_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ligne de devis introuvable'; END IF;
  IF item.part_id IS NULL THEN RAISE EXCEPTION 'La ligne ne référence pas de pièce'; END IF;
  SELECT * INTO quote_row FROM public.quotes WHERE id = item.quote_id;
  loc_id := item.storage_location_id;
  IF loc_id IS NULL THEN
    IF quote_row.site_id IS NULL THEN RAISE EXCEPTION 'Aucun site associé au devis'; END IF;
    loc_id := public.ensure_site_storage_location(quote_row.site_id, item.owner_id);
  END IF;
  qty := GREATEST(item.quantity, 0);
  SELECT * INTO stock FROM public.storage_location_stocks
    WHERE storage_location_id = loc_id AND part_id = item.part_id FOR UPDATE;
  IF NOT FOUND OR stock.quantity_available < qty THEN
    RAISE EXCEPTION 'Stock site insuffisant pour cette pièce';
  END IF;
  UPDATE public.storage_location_stocks
    SET quantity_available = quantity_available - qty, updated_at = now()
    WHERE id = stock.id;
  UPDATE public.quote_items
    SET stock_usage = 'use_site_stock', storage_location_id = loc_id, unit_price = 0
    WHERE id = item.id;
  INSERT INTO public.stock_movements(owner_id, storage_location_id, part_id, movement_type, quantity, reason, created_by)
    VALUES (item.owner_id, loc_id, item.part_id, 'sortie_stock', qty, 'Consommation stock site depuis devis/intervention', p_actor);
END $$;

CREATE OR REPLACE FUNCTION public.receive_quote_item_to_site_stock(p_quote_item_id UUID, p_actor UUID DEFAULT auth.uid())
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item RECORD; quote_row RECORD; loc_id UUID; qty NUMERIC;
BEGIN
  SELECT * INTO item FROM public.quote_items WHERE id = p_quote_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ligne de devis introuvable'; END IF;
  IF item.part_id IS NULL THEN RAISE EXCEPTION 'La ligne ne référence pas de pièce'; END IF;
  SELECT * INTO quote_row FROM public.quotes WHERE id = item.quote_id;
  loc_id := item.storage_location_id;
  IF loc_id IS NULL THEN
    IF quote_row.site_id IS NULL THEN RAISE EXCEPTION 'Aucun site associé au devis'; END IF;
    loc_id := public.ensure_site_storage_location(quote_row.site_id, item.owner_id);
  END IF;
  qty := GREATEST(item.quantity, 0);
  INSERT INTO public.storage_location_stocks(owner_id, storage_location_id, part_id, quantity_available)
  VALUES (item.owner_id, loc_id, item.part_id, qty)
  ON CONFLICT (storage_location_id, part_id)
  DO UPDATE SET quantity_available = public.storage_location_stocks.quantity_available + EXCLUDED.quantity_available, updated_at = now();
  UPDATE public.quote_items SET stock_usage = 'replenish_site_stock', storage_location_id = loc_id WHERE id = item.id;
  INSERT INTO public.stock_movements(owner_id, storage_location_id, part_id, movement_type, quantity, reason, created_by)
    VALUES (item.owner_id, loc_id, item.part_id, 'entree_stock', qty, 'Entrée stock site depuis devis', p_actor);
END $$;

GRANT EXECUTE ON FUNCTION public.ensure_site_storage_location(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_site_stock_from_quote_item(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.receive_quote_item_to_site_stock(UUID, UUID) TO authenticated, service_role;
CREATE INDEX IF NOT EXISTS tickets_ticket_type_idx ON public.tickets(ticket_type, status);
CREATE INDEX IF NOT EXISTS quote_items_stock_usage_idx ON public.quote_items(stock_usage, storage_location_id);
