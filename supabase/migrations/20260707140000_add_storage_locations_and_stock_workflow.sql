-- Lieux de stockage, stocks et workflow avancé des commandes de pièces
CREATE TABLE IF NOT EXISTS public.storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'autre' CHECK (type IN ('agence','depot','vehicule_technicien','autre')),
  address TEXT NOT NULL,
  postal_code TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'France',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.storage_location_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_location_id UUID NOT NULL REFERENCES public.storage_locations(id) ON DELETE CASCADE,
  supplier_part_id UUID REFERENCES public.supplier_parts(id) ON DELETE SET NULL,
  part_id UUID REFERENCES public.parts(id) ON DELETE CASCADE,
  quantity_available NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  quantity_reserved NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  quantity_minimum NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (quantity_minimum >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (part_id IS NOT NULL OR supplier_part_id IS NOT NULL),
  CHECK (quantity_reserved <= quantity_available),
  UNIQUE(storage_location_id, part_id),
  UNIQUE(storage_location_id, supplier_part_id)
);

ALTER TABLE public.part_orders
  ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stock_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  ALTER COLUMN status SET DEFAULT 'brouillon';

ALTER TABLE public.part_order_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'a_commander',
  ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('stock','fournisseur')),
  ADD COLUMN IF NOT EXISTS storage_location_id UUID REFERENCES public.storage_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_part_id UUID REFERENCES public.supplier_parts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity_requested NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS quantity_from_stock NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_to_order NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_recovered NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_received NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suggestion JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.part_order_items SET quantity_requested = quantity WHERE quantity_requested IS NULL;
ALTER TABLE public.part_order_items ALTER COLUMN quantity_requested SET DEFAULT 1;
ALTER TABLE public.part_order_items ALTER COLUMN quantity_requested SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_location_id UUID REFERENCES public.storage_locations(id) ON DELETE SET NULL,
  part_id UUID REFERENCES public.parts(id) ON DELETE SET NULL,
  command_ticket_id UUID REFERENCES public.part_orders(id) ON DELETE SET NULL,
  part_order_item_id UUID REFERENCES public.part_order_items(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('reservation','liberation','sortie_stock','entree_stock','correction','forcage_intervention')),
  quantity NUMERIC(10,2) NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.refresh_part_order_status(p_part_order_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s TEXT; total INT; ready INT; stock_pending INT; recovering INT; supplier_pending INT; partial_received INT;
BEGIN
  SELECT count(*),
    count(*) FILTER (WHERE status IN ('recuperee','recue_fournisseur','annulee')),
    count(*) FILTER (WHERE status IN ('disponible_en_stock','recuperation_a_planifier','recuperation_planifiee')),
    count(*) FILTER (WHERE status = 'en_cours_de_recuperation'),
    count(*) FILTER (WHERE status IN ('a_commander','commandee_fournisseur','indisponible','partiellement_disponible')),
    count(*) FILTER (WHERE quantity_received > 0 AND status <> 'recue_fournisseur')
  INTO total, ready, stock_pending, recovering, supplier_pending, partial_received
  FROM public.part_order_items WHERE part_order_id = p_part_order_id;

  s := CASE
    WHEN total = 0 THEN 'brouillon'
    WHEN ready = total THEN 'pieces_pretes'
    WHEN recovering > 0 THEN 'recuperation_en_cours'
    WHEN partial_received > 0 THEN 'reception_partielle'
    WHEN supplier_pending > 0 THEN 'attente_commande_fournisseur'
    WHEN stock_pending > 0 THEN 'recuperation_a_planifier'
    ELSE 'analyse_stock'
  END;
  UPDATE public.part_orders SET status = s WHERE id = p_part_order_id;
  RETURN s;
END $$;

CREATE OR REPLACE FUNCTION public.reserve_stock_for_part_order_item(p_item_id UUID, p_storage_location_id UUID, p_quantity NUMERIC, p_actor UUID DEFAULT auth.uid())
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item RECORD; stock RECORD; real_available NUMERIC;
BEGIN
  SELECT * INTO item FROM public.part_order_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ligne de commande introuvable'; END IF;
  SELECT * INTO stock FROM public.storage_location_stocks
    WHERE storage_location_id = p_storage_location_id AND part_id = item.part_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stock introuvable pour cette pièce'; END IF;
  real_available := stock.quantity_available - stock.quantity_reserved;
  IF p_quantity > real_available THEN RAISE EXCEPTION 'Stock disponible insuffisant (% disponible)', real_available; END IF;

  UPDATE public.storage_location_stocks SET quantity_reserved = quantity_reserved + p_quantity, updated_at = now() WHERE id = stock.id;
  UPDATE public.part_order_items SET source_type = 'stock', storage_location_id = p_storage_location_id,
    quantity_from_stock = p_quantity, quantity_to_order = GREATEST(quantity_requested - p_quantity, 0),
    status = CASE WHEN p_quantity >= quantity_requested THEN 'recuperation_a_planifier' ELSE 'partiellement_disponible' END
    WHERE id = p_item_id;
  INSERT INTO public.stock_movements(owner_id, storage_location_id, part_id, command_ticket_id, part_order_item_id, movement_type, quantity, reason, created_by)
    VALUES (item.owner_id, p_storage_location_id, item.part_id, item.part_order_id, p_item_id, 'reservation', p_quantity, 'Réservation automatique commande pièces', p_actor);
  PERFORM public.refresh_part_order_status(item.part_order_id);
END $$;

CREATE OR REPLACE FUNCTION public.recover_stock_for_part_order_item(p_item_id UUID, p_quantity NUMERIC, p_actor UUID DEFAULT auth.uid())
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item RECORD; reserved_left NUMERIC;
BEGIN
  SELECT * INTO item FROM public.part_order_items WHERE id = p_item_id FOR UPDATE;
  IF item.storage_location_id IS NULL THEN RAISE EXCEPTION 'Aucun lieu de stockage réservé'; END IF;
  reserved_left := item.quantity_from_stock - item.quantity_recovered;
  IF p_quantity > reserved_left THEN RAISE EXCEPTION 'Impossible de récupérer plus que la quantité réservée restante'; END IF;
  UPDATE public.storage_location_stocks SET quantity_available = quantity_available - p_quantity,
    quantity_reserved = quantity_reserved - p_quantity, updated_at = now()
    WHERE storage_location_id = item.storage_location_id AND part_id = item.part_id;
  UPDATE public.part_order_items SET quantity_recovered = quantity_recovered + p_quantity,
    status = CASE WHEN quantity_recovered + p_quantity >= quantity_from_stock AND quantity_to_order = 0 THEN 'recuperee' ELSE status END
    WHERE id = p_item_id;
  INSERT INTO public.stock_movements(owner_id, storage_location_id, part_id, command_ticket_id, part_order_item_id, movement_type, quantity, reason, created_by)
    VALUES (item.owner_id, item.storage_location_id, item.part_id, item.part_order_id, p_item_id, 'sortie_stock', p_quantity, 'Pièce récupérée depuis le stock', p_actor);
  PERFORM public.refresh_part_order_status(item.part_order_id);
END $$;

CREATE OR REPLACE FUNCTION public.release_stock_for_part_order_item(p_item_id UUID, p_actor UUID DEFAULT auth.uid())
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item RECORD; qty NUMERIC;
BEGIN
  SELECT * INTO item FROM public.part_order_items WHERE id = p_item_id FOR UPDATE;
  qty := GREATEST(item.quantity_from_stock - item.quantity_recovered, 0);
  IF qty > 0 AND item.storage_location_id IS NOT NULL THEN
    UPDATE public.storage_location_stocks SET quantity_reserved = quantity_reserved - qty, updated_at = now()
      WHERE storage_location_id = item.storage_location_id AND part_id = item.part_id;
    INSERT INTO public.stock_movements(owner_id, storage_location_id, part_id, command_ticket_id, part_order_item_id, movement_type, quantity, reason, created_by)
      VALUES (item.owner_id, item.storage_location_id, item.part_id, item.part_order_id, p_item_id, 'liberation', qty, 'Libération réservation commande annulée', p_actor);
  END IF;
  UPDATE public.part_order_items SET status = 'annulee' WHERE id = p_item_id;
  PERFORM public.refresh_part_order_status(item.part_order_id);
END $$;

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['storage_locations','storage_location_stocks','stock_movements'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='own ' || t) THEN
      EXECUTE format('CREATE POLICY %L ON public.%I FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id)', 'own ' || t, t);
    END IF;
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.refresh_part_order_status(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_stock_for_part_order_item(UUID, UUID, NUMERIC, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recover_stock_for_part_order_item(UUID, NUMERIC, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_stock_for_part_order_item(UUID, UUID) TO authenticated, service_role;

DROP TRIGGER IF EXISTS t_storage_locations_upd ON public.storage_locations;
CREATE TRIGGER t_storage_locations_upd BEFORE UPDATE ON public.storage_locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS storage_locations_owner_active_idx ON public.storage_locations(owner_id, is_active);
CREATE INDEX IF NOT EXISTS storage_location_stocks_part_idx ON public.storage_location_stocks(part_id, storage_location_id);
CREATE INDEX IF NOT EXISTS stock_movements_command_ticket_idx ON public.stock_movements(command_ticket_id, created_at DESC);
