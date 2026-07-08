-- Facturation des remplacements réalisés sur ticket
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  installation_id UUID REFERENCES public.installations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon','emise','payee','annulee')),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 20,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  client_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  part_id UUID REFERENCES public.parts(id) ON DELETE SET NULL,
  storage_location_id UUID REFERENCES public.storage_locations(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'technician_stock' CHECK (source_type IN ('technician_stock','site_stock','service')),
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_ticket_idx ON public.invoices(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invoice_items_invoice_idx ON public.invoice_items(invoice_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices owner access" ON public.invoices FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "invoice_items owner access" ON public.invoice_items FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoices TO service_role;
GRANT ALL ON public.invoice_items TO service_role;

CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
