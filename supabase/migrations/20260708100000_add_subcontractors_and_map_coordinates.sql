ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

CREATE TABLE IF NOT EXISTS public.subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'sst',
  email TEXT,
  phone TEXT,
  address TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  payment_terms TEXT,
  account_holder TEXT,
  iban TEXT,
  bic TEXT,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  travel_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  half_day_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  day_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  included_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  extra_km_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  intervention_zone JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subcontractors TO authenticated;
GRANT ALL ON public.subcontractors TO service_role;

ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own subcontractors" ON public.subcontractors;
CREATE POLICY "own subcontractors" ON public.subcontractors
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP TRIGGER IF EXISTS subcontractors_set_updated_at ON public.subcontractors;
CREATE TRIGGER subcontractors_set_updated_at
  BEFORE UPDATE ON public.subcontractors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.subcontractor_installation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  installation_type_id UUID NOT NULL REFERENCES public.installation_types(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subcontractor_id, installation_type_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subcontractor_installation_types TO authenticated;
GRANT ALL ON public.subcontractor_installation_types TO service_role;

ALTER TABLE public.subcontractor_installation_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own subcontractor_installation_types" ON public.subcontractor_installation_types;
CREATE POLICY "own subcontractor_installation_types" ON public.subcontractor_installation_types
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
