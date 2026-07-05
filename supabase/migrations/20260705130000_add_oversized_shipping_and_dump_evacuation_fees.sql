ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS oversized_shipping_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS dump_evacuation_fee NUMERIC;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS oversized_shipping_fee NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dump_evacuation_fee NUMERIC NOT NULL DEFAULT 0;
