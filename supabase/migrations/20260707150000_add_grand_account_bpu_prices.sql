-- BPU et conditions de vente spéciales pour les grands comptes.
ALTER TABLE public.grand_accounts
  ADD COLUMN IF NOT EXISTS out_of_bpu_purchase_coef NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS out_of_bpu_discount_pct NUMERIC(5,2) DEFAULT 0;

ALTER TABLE public.grand_accounts
  DROP CONSTRAINT IF EXISTS grand_accounts_out_of_bpu_purchase_coef_positive,
  DROP CONSTRAINT IF EXISTS grand_accounts_out_of_bpu_discount_pct_range;
ALTER TABLE public.grand_accounts
  ADD CONSTRAINT grand_accounts_out_of_bpu_purchase_coef_positive
    CHECK (out_of_bpu_purchase_coef IS NULL OR out_of_bpu_purchase_coef >= 0),
  ADD CONSTRAINT grand_accounts_out_of_bpu_discount_pct_range
    CHECK (out_of_bpu_discount_pct IS NULL OR (out_of_bpu_discount_pct >= 0 AND out_of_bpu_discount_pct <= 100));

CREATE TABLE IF NOT EXISTS public.grand_account_bpu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  grand_account_id UUID NOT NULL REFERENCES public.grand_accounts(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  pricing_mode TEXT NOT NULL DEFAULT 'manual',
  manual_sale_price NUMERIC(12,2),
  purchase_coef NUMERIC(10,4),
  discount_pct NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(grand_account_id, part_id)
);

ALTER TABLE public.grand_account_bpu_items
  DROP CONSTRAINT IF EXISTS grand_account_bpu_items_pricing_mode_check,
  DROP CONSTRAINT IF EXISTS grand_account_bpu_items_manual_sale_price_non_negative,
  DROP CONSTRAINT IF EXISTS grand_account_bpu_items_purchase_coef_non_negative,
  DROP CONSTRAINT IF EXISTS grand_account_bpu_items_discount_pct_range;
ALTER TABLE public.grand_account_bpu_items
  ADD CONSTRAINT grand_account_bpu_items_pricing_mode_check
    CHECK (pricing_mode IN ('manual', 'purchase_coef', 'discount')),
  ADD CONSTRAINT grand_account_bpu_items_manual_sale_price_non_negative
    CHECK (manual_sale_price IS NULL OR manual_sale_price >= 0),
  ADD CONSTRAINT grand_account_bpu_items_purchase_coef_non_negative
    CHECK (purchase_coef IS NULL OR purchase_coef >= 0),
  ADD CONSTRAINT grand_account_bpu_items_discount_pct_range
    CHECK (discount_pct IS NULL OR (discount_pct >= 0 AND discount_pct <= 100));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grand_account_bpu_items TO authenticated;
GRANT ALL ON public.grand_account_bpu_items TO service_role;
ALTER TABLE public.grand_account_bpu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own grand_account_bpu_items" ON public.grand_account_bpu_items;
CREATE POLICY "own grand_account_bpu_items" ON public.grand_account_bpu_items
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP TRIGGER IF EXISTS t_grand_account_bpu_items_upd ON public.grand_account_bpu_items;
CREATE TRIGGER t_grand_account_bpu_items_upd
  BEFORE UPDATE ON public.grand_account_bpu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_grand_account_bpu_items_account ON public.grand_account_bpu_items(grand_account_id);
CREATE INDEX IF NOT EXISTS idx_grand_account_bpu_items_part ON public.grand_account_bpu_items(part_id);
CREATE INDEX IF NOT EXISTS idx_grand_account_bpu_items_owner ON public.grand_account_bpu_items(owner_id);

COMMENT ON TABLE public.grand_account_bpu_items IS 'BPU grand compte : prix spéciaux par pièce priorisés sur les tarifs contrat client.';
