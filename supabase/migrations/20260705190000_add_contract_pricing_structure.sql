-- Contract pricing tiers by installation type
CREATE TABLE IF NOT EXISTS public.contract_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  installation_type_id UUID NOT NULL REFERENCES public.installation_types(id) ON DELETE CASCADE,
  base_annual_price NUMERIC NOT NULL DEFAULT 0,
  min_installations INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contract_id, installation_type_id, min_installations)
);

-- Installation requirements and special equipment needs
CREATE TABLE IF NOT EXISTS public.installation_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  installation_id UUID NOT NULL REFERENCES public.installations(id) ON DELETE CASCADE,
  requires_multiple_technicians BOOLEAN DEFAULT FALSE,
  multiple_technicians_count INTEGER DEFAULT 1,
  requires_lifting_equipment BOOLEAN DEFAULT FALSE,
  lifting_equipment_type TEXT,
  requires_special_equipment BOOLEAN DEFAULT FALSE,
  special_equipment_description TEXT,
  price_adjustment_pct NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(installation_id)
);

-- Customer-specific pricing adjustments for contracts
CREATE TABLE IF NOT EXISTS public.contract_client_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  adjustment_pct NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contract_id, client_id)
);

-- Enable RLS and grant permissions
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['contract_pricing_tiers','installation_requirements','contract_client_pricing'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='own ' || t) THEN
      EXECUTE format('CREATE POLICY %L ON public.%I FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id)', 'own ' || t, t);
    END IF;
  END LOOP;
END $$;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS t_contract_pricing_tiers_upd ON public.contract_pricing_tiers;
CREATE TRIGGER t_contract_pricing_tiers_upd BEFORE UPDATE ON public.contract_pricing_tiers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS t_installation_requirements_upd ON public.installation_requirements;
CREATE TRIGGER t_installation_requirements_upd BEFORE UPDATE ON public.installation_requirements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS t_contract_client_pricing_upd ON public.contract_client_pricing;
CREATE TRIGGER t_contract_client_pricing_upd BEFORE UPDATE ON public.contract_client_pricing FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contract_pricing_tiers_contract ON public.contract_pricing_tiers(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_pricing_tiers_type ON public.contract_pricing_tiers(installation_type_id);
CREATE INDEX IF NOT EXISTS idx_installation_requirements_installation ON public.installation_requirements(installation_id);
CREATE INDEX IF NOT EXISTS idx_contract_client_pricing_contract ON public.contract_client_pricing(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_client_pricing_client ON public.contract_client_pricing(client_id);
