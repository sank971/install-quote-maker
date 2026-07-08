-- Tickets de réassort, transfert interne et commande fournisseur liés aux lieux de stockage
CREATE TABLE IF NOT EXISTS public.stock_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL DEFAULT ('STK-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  type TEXT NOT NULL CHECK (type IN ('transfert_interne','commande_fournisseur')),
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon','en_attente','en_preparation','en_transit','livre','termine','annule')),
  source_location_id UUID REFERENCES public.storage_locations(id) ON DELETE SET NULL,
  destination_location_id UUID NOT NULL REFERENCES public.storage_locations(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stock_tickets_transfer_source_check CHECK (type <> 'transfert_interne' OR source_location_id IS NOT NULL),
  CONSTRAINT stock_tickets_supplier_source_check CHECK (type <> 'commande_fournisseur' OR supplier_id IS NOT NULL)
);

CREATE OR REPLACE FUNCTION public.complete_stock_ticket(p_ticket_id UUID, p_actor UUID DEFAULT auth.uid())
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ticket RECORD; existing_destination UUID;
BEGIN
  SELECT * INTO ticket FROM public.stock_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket stock introuvable'; END IF;
  IF ticket.status = 'termine' THEN RETURN; END IF;
  IF ticket.status = 'annule' THEN RAISE EXCEPTION 'Impossible de compléter un ticket annulé'; END IF;

  IF ticket.type = 'transfert_interne' THEN
    UPDATE public.storage_location_stocks
      SET quantity_available = quantity_available - ticket.quantity, updated_at = now()
      WHERE storage_location_id = ticket.source_location_id
        AND part_id = ticket.part_id
        AND quantity_available - quantity_reserved >= ticket.quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'Stock source insuffisant pour compléter le transfert'; END IF;

    INSERT INTO public.stock_movements(owner_id, storage_location_id, part_id, movement_type, quantity, reason, created_by)
      VALUES (ticket.owner_id, ticket.source_location_id, ticket.part_id, 'sortie_stock', ticket.quantity, 'Transfert interne ' || ticket.ticket_number, p_actor);
  END IF;

  SELECT id INTO existing_destination FROM public.storage_location_stocks
    WHERE storage_location_id = ticket.destination_location_id AND part_id = ticket.part_id;

  IF existing_destination IS NULL THEN
    INSERT INTO public.storage_location_stocks(owner_id, storage_location_id, part_id, quantity_available, quantity_reserved, quantity_minimum)
      VALUES (ticket.owner_id, ticket.destination_location_id, ticket.part_id, ticket.quantity, 0, 0);
  ELSE
    UPDATE public.storage_location_stocks
      SET quantity_available = quantity_available + ticket.quantity, updated_at = now()
      WHERE id = existing_destination;
  END IF;

  INSERT INTO public.stock_movements(owner_id, storage_location_id, part_id, movement_type, quantity, reason, created_by)
    VALUES (ticket.owner_id, ticket.destination_location_id, ticket.part_id, 'entree_stock', ticket.quantity,
      CASE WHEN ticket.type = 'transfert_interne' THEN 'Réception transfert interne ' ELSE 'Réception commande fournisseur ' END || ticket.ticket_number, p_actor);

  UPDATE public.stock_tickets SET status = 'termine', completed_at = now(), updated_at = now() WHERE id = p_ticket_id;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_tickets TO authenticated;
GRANT ALL ON public.stock_tickets TO service_role;
ALTER TABLE public.stock_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own stock_tickets" ON public.stock_tickets;
CREATE POLICY "own stock_tickets" ON public.stock_tickets FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
GRANT EXECUTE ON FUNCTION public.complete_stock_ticket(UUID, UUID) TO authenticated, service_role;

DROP TRIGGER IF EXISTS t_stock_tickets_upd ON public.stock_tickets;
CREATE TRIGGER t_stock_tickets_upd BEFORE UPDATE ON public.stock_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS stock_tickets_destination_status_idx ON public.stock_tickets(destination_location_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_tickets_source_status_idx ON public.stock_tickets(source_location_id, status, created_at DESC);
