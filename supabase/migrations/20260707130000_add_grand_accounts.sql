-- Grands comptes : regroupement de plusieurs clients pour consolider les statistiques.
CREATE TABLE IF NOT EXISTS public.grand_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grand_accounts TO authenticated;
GRANT ALL ON public.grand_accounts TO service_role;
ALTER TABLE public.grand_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own grand_accounts" ON public.grand_accounts;
CREATE POLICY "own grand_accounts" ON public.grand_accounts
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP TRIGGER IF EXISTS t_grand_accounts_upd ON public.grand_accounts;
CREATE TRIGGER t_grand_accounts_upd
  BEFORE UPDATE ON public.grand_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS grand_account_id UUID REFERENCES public.grand_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_grand_accounts_owner_name ON public.grand_accounts(owner_id, name);
CREATE INDEX IF NOT EXISTS idx_clients_grand_account_id ON public.clients(grand_account_id);
