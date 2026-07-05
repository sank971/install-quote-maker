-- Configurable ERP engines for automatic-closure quoting.
-- All tables are owner-scoped and compatible with Supabase RLS.

ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS subfamily TEXT,
  ADD COLUMN IF NOT EXISTS manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS documentation_url TEXT,
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recommended_sale_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS min_sale_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS max_sale_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS coefficient NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS margin_rate NUMERIC(7,4),
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS technical_specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS commercial_specs JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.part_family_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  family_name TEXT NOT NULL,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'number',
  unit TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, family_name, field_key)
);

CREATE TABLE IF NOT EXISTS public.calculation_formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  target_key TEXT NOT NULL,
  expression TEXT NOT NULL,
  description TEXT,
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, code)
);

CREATE TABLE IF NOT EXISTS public.business_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, code)
);

CREATE TABLE IF NOT EXISTS public.bom_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  installation_type_id UUID REFERENCES public.installation_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bom_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  bom_template_id UUID NOT NULL REFERENCES public.bom_templates(id) ON DELETE CASCADE,
  part_family TEXT NOT NULL,
  quantity_formula_code TEXT,
  selection_strategy TEXT NOT NULL DEFAULT 'best_supplier_margin',
  required BOOLEAN NOT NULL DEFAULT true,
  position INT NOT NULL DEFAULT 0,
  constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.part_compatibilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  target_kind TEXT NOT NULL,
  target_id UUID,
  target_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, part_id, target_kind, target_id, target_value)
);

CREATE TABLE IF NOT EXISTS public.quote_calculation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  session_key TEXT,
  step TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['part_family_fields','calculation_formulas','business_rules','bom_templates','bom_template_items','part_compatibilities','quote_calculation_logs'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name AND policyname = 'own rows') THEN
      EXECUTE format('CREATE POLICY "own rows" ON public.%I FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id)', table_name);
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS part_family_fields_family_idx ON public.part_family_fields(owner_id, family_name);
CREATE INDEX IF NOT EXISTS business_rules_active_idx ON public.business_rules(owner_id, is_active, priority);
CREATE INDEX IF NOT EXISTS calculation_formulas_active_idx ON public.calculation_formulas(owner_id, is_active, position);
CREATE INDEX IF NOT EXISTS bom_template_items_template_idx ON public.bom_template_items(bom_template_id, position);
CREATE INDEX IF NOT EXISTS part_compatibilities_part_idx ON public.part_compatibilities(part_id, target_kind);
CREATE INDEX IF NOT EXISTS quote_calculation_logs_quote_idx ON public.quote_calculation_logs(quote_id, created_at);
