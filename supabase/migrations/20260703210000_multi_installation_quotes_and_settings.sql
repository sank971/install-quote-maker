CREATE TABLE IF NOT EXISTS public.installation_type_default_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES public.installation_types(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(type_id, part_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installation_type_default_parts TO authenticated;
GRANT ALL ON public.installation_type_default_parts TO service_role;
ALTER TABLE public.installation_type_default_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own installation_type_default_parts" ON public.installation_type_default_parts FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS public.quote_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  installation_id UUID NOT NULL REFERENCES public.installations(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(quote_id, installation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_installations TO authenticated;
GRANT ALL ON public.quote_installations TO service_role;
ALTER TABLE public.quote_installations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quote_installations" ON public.quote_installations FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX IF NOT EXISTS quote_installations_quote_id_idx ON public.quote_installations (quote_id, position);

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own app_settings" ON public.app_settings FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER t_app_settings_upd BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS installation_id UUID REFERENCES public.installations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS quote_items_installation_id_idx ON public.quote_items (installation_id);
