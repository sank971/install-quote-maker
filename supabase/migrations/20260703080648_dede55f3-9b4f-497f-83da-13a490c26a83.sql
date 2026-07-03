
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS email TEXT;

CREATE TABLE IF NOT EXISTS public.site_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_contacts TO authenticated;
GRANT ALL ON public.site_contacts TO service_role;

ALTER TABLE public.site_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own site_contacts" ON public.site_contacts
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER site_contacts_set_updated_at
  BEFORE UPDATE ON public.site_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
