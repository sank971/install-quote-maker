-- Regroupement de tickets par site et devis globaux multi-tickets
CREATE TABLE IF NOT EXISTS public.ticket_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ouvert',
  title TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_group_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.ticket_groups(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, ticket_id),
  UNIQUE(ticket_id)
);

CREATE TABLE IF NOT EXISTS public.quote_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(quote_id, ticket_id)
);

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS ticket_group_id UUID REFERENCES public.ticket_groups(id) ON DELETE SET NULL;
ALTER TABLE public.history_events ADD COLUMN IF NOT EXISTS ticket_group_id UUID REFERENCES public.ticket_groups(id) ON DELETE CASCADE;
ALTER TABLE public.part_orders ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL;

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['ticket_groups','ticket_group_tickets','quote_tickets'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='own ' || t) THEN
      EXECUTE format('CREATE POLICY %L ON public.%I FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id)', 'own ' || t, t);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_ticket_group_single_site()
RETURNS TRIGGER AS $$
DECLARE g_site UUID; g_client UUID; t_site UUID; t_client UUID;
BEGIN
  SELECT site_id, client_id INTO g_site, g_client FROM public.ticket_groups WHERE id = NEW.group_id;
  SELECT site_id, client_id INTO t_site, t_client FROM public.tickets WHERE id = NEW.ticket_id;
  IF g_site IS NULL OR t_site IS NULL OR g_site <> t_site THEN
    RAISE EXCEPTION 'Impossible de regrouper des tickets provenant de sites différents';
  END IF;
  IF g_client <> t_client THEN
    RAISE EXCEPTION 'Le ticket doit appartenir au même client que le dossier site';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.enforce_quote_ticket_same_site()
RETURNS TRIGGER AS $$
DECLARE q_site UUID; q_client UUID; t_site UUID; t_client UUID;
BEGIN
  SELECT site_id, client_id INTO q_site, q_client FROM public.quotes WHERE id = NEW.quote_id;
  SELECT site_id, client_id INTO t_site, t_client FROM public.tickets WHERE id = NEW.ticket_id;
  IF q_site IS NOT NULL AND q_site <> t_site THEN
    RAISE EXCEPTION 'Un devis global ne peut pas lier des tickets de sites différents';
  END IF;
  IF q_client <> t_client THEN
    RAISE EXCEPTION 'Un devis global ne peut pas lier des tickets de clients différents';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS t_ticket_group_tickets_single_site ON public.ticket_group_tickets;
CREATE TRIGGER t_ticket_group_tickets_single_site BEFORE INSERT OR UPDATE ON public.ticket_group_tickets FOR EACH ROW EXECUTE FUNCTION public.enforce_ticket_group_single_site();
DROP TRIGGER IF EXISTS t_quote_tickets_same_site ON public.quote_tickets;
CREATE TRIGGER t_quote_tickets_same_site BEFORE INSERT OR UPDATE ON public.quote_tickets FOR EACH ROW EXECUTE FUNCTION public.enforce_quote_ticket_same_site();
DROP TRIGGER IF EXISTS t_ticket_groups_upd ON public.ticket_groups;
CREATE TRIGGER t_ticket_groups_upd BEFORE UPDATE ON public.ticket_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ticket_groups_site_status ON public.ticket_groups(site_id, status);
CREATE INDEX IF NOT EXISTS idx_ticket_group_tickets_group ON public.ticket_group_tickets(group_id);
CREATE INDEX IF NOT EXISTS idx_quote_tickets_quote ON public.quote_tickets(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_tickets_ticket ON public.quote_tickets(ticket_id);
