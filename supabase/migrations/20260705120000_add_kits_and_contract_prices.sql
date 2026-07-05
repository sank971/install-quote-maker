ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS is_kit BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.contract_kit_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  kit_part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  negotiated_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contract_id, kit_part_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_kit_prices TO authenticated;
GRANT ALL ON public.contract_kit_prices TO service_role;

ALTER TABLE public.contract_kit_prices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contract_kit_prices'
      AND policyname = 'own contract_kit_prices'
  ) THEN
    CREATE POLICY "own contract_kit_prices" ON public.contract_kit_prices
      FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

CREATE TRIGGER t_contract_kit_prices_upd
  BEFORE UPDATE ON public.contract_kit_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS contract_kit_prices_contract_id_idx
  ON public.contract_kit_prices (contract_id);
CREATE INDEX IF NOT EXISTS contract_kit_prices_kit_part_id_idx
  ON public.contract_kit_prices (kit_part_id);
CREATE INDEX IF NOT EXISTS contract_kit_prices_owner_id_idx
  ON public.contract_kit_prices (owner_id);
