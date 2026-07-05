ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS is_oversized BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS out_of_contract_hourly_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS out_of_contract_travel_fee NUMERIC;
