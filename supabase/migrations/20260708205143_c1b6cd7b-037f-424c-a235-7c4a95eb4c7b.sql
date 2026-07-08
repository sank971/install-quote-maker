
-- Cost settings (one row per owner)
CREATE TABLE IF NOT EXISTS public.cost_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  cost_per_km NUMERIC NOT NULL DEFAULT 0.5,
  fuel_price NUMERIC NOT NULL DEFAULT 1.8,
  vehicle_consumption NUMERIC NOT NULL DEFAULT 7,
  vehicle_cost_per_km NUMERIC NOT NULL DEFAULT 0.15,
  technician_hourly_cost NUMERIC NOT NULL DEFAULT 45,
  admin_hourly_cost NUMERIC NOT NULL DEFAULT 35,
  average_shipping_cost NUMERIC NOT NULL DEFAULT 15,
  minimum_margin_pct NUMERIC NOT NULL DEFAULT 25,
  agency_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_settings TO authenticated;
GRANT ALL ON public.cost_settings TO service_role;
ALTER TABLE public.cost_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost_settings owner access" ON public.cost_settings
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER cost_settings_updated_at BEFORE UPDATE ON public.cost_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Real cost fields on interventions
ALTER TABLE public.interventions
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC,
  ADD COLUMN IF NOT EXISTS travel_minutes NUMERIC,
  ADD COLUMN IF NOT EXISTS onsite_minutes NUMERIC,
  ADD COLUMN IF NOT EXISTS fuel_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS toll_parking_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS subcontractor_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS admin_minutes NUMERIC,
  ADD COLUMN IF NOT EXISTS extra_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS extra_cost_reason TEXT,
  ADD COLUMN IF NOT EXISTS technician_id UUID,
  ADD COLUMN IF NOT EXISTS start_address TEXT;

-- Real cost fields on part_orders
ALTER TABLE public.part_orders
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS pickup_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS supplier_delivery_cost NUMERIC;

-- Real purchase cost per item
ALTER TABLE public.part_order_items
  ADD COLUMN IF NOT EXISTS unit_purchase_cost_actual NUMERIC;
