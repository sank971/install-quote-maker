-- Module complet de calcul du coût de revient réel des interventions.

ALTER TABLE public.cost_settings
  ADD COLUMN IF NOT EXISTS default_technicians_count NUMERIC NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS default_onsite_minutes NUMERIC NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS default_travel_minutes NUMERIC NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS default_admin_before_minutes NUMERIC NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS default_admin_after_minutes NUMERIC NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS overhead_mode TEXT NOT NULL DEFAULT 'fixed_per_intervention',
  ADD COLUMN IF NOT EXISTS overhead_fixed_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overhead_hourly_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overhead_revenue_pct NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overhead_direct_cost_pct NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overhead_agency_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_part_storage_cost NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_part_preparation_cost NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_part_packaging_cost NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.cost_settings DROP CONSTRAINT IF EXISTS cost_settings_overhead_mode_check;
ALTER TABLE public.cost_settings
  ADD CONSTRAINT cost_settings_overhead_mode_check CHECK (overhead_mode IN (
    'fixed_per_intervention','fixed_per_hour','revenue_percentage','direct_cost_percentage','agency_cost'
  ));

CREATE TABLE IF NOT EXISTS public.technician_cost_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technician_id UUID,
  technician_name TEXT NOT NULL,
  address TEXT,
  real_hourly_cost NUMERIC,
  monthly_gross_salary NUMERIC NOT NULL DEFAULT 0,
  employer_charges_pct NUMERIC NOT NULL DEFAULT 0,
  monthly_employer_cost NUMERIC NOT NULL DEFAULT 0,
  monthly_worked_hours NUMERIC NOT NULL DEFAULT 151.67,
  calculated_hourly_cost NUMERIC GENERATED ALWAYS AS (CASE WHEN monthly_worked_hours > 0 THEN monthly_employer_cost / monthly_worked_hours ELSE 0 END) STORED,
  manual_hourly_cost NUMERIC,
  average_meal_cost NUMERIC NOT NULL DEFAULT 0,
  average_bonus_cost NUMERIC NOT NULL DEFAULT 0,
  annual_equipment_clothing_cost NUMERIC NOT NULL DEFAULT 0,
  annual_training_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  registration TEXT,
  assigned_technician_id UUID,
  vehicle_type TEXT,
  purchase_cost NUMERIC NOT NULL DEFAULT 0,
  monthly_rental_cost NUMERIC NOT NULL DEFAULT 0,
  amortization_months NUMERIC NOT NULL DEFAULT 60,
  annual_insurance NUMERIC NOT NULL DEFAULT 0,
  annual_maintenance NUMERIC NOT NULL DEFAULT 0,
  annual_tires NUMERIC NOT NULL DEFAULT 0,
  annual_technical_inspection NUMERIC NOT NULL DEFAULT 0,
  annual_fuel_cost NUMERIC NOT NULL DEFAULT 0,
  average_consumption_l_100km NUMERIC NOT NULL DEFAULT 0,
  average_fuel_price NUMERIC NOT NULL DEFAULT 0,
  annual_tolls NUMERIC NOT NULL DEFAULT 0,
  annual_parking NUMERIC NOT NULL DEFAULT 0,
  annual_washing NUMERIC NOT NULL DEFAULT 0,
  annual_repairs NUMERIC NOT NULL DEFAULT 0,
  annual_other_costs NUMERIC NOT NULL DEFAULT 0,
  estimated_annual_mileage NUMERIC NOT NULL DEFAULT 20000,
  manual_cost_per_km NUMERIC,
  calculated_annual_cost NUMERIC GENERATED ALWAYS AS (
    CASE WHEN monthly_rental_cost > 0 THEN monthly_rental_cost * 12 ELSE CASE WHEN amortization_months > 0 THEN purchase_cost / amortization_months * 12 ELSE 0 END END
    + annual_insurance + annual_maintenance + annual_tires + annual_technical_inspection
    + CASE WHEN annual_fuel_cost > 0 THEN annual_fuel_cost ELSE estimated_annual_mileage * average_consumption_l_100km * average_fuel_price / 100 END
    + annual_tolls + annual_parking + annual_washing + annual_repairs + annual_other_costs
  ) STORED,
  calculated_cost_per_km NUMERIC GENERATED ALWAYS AS (
    CASE WHEN estimated_annual_mileage > 0 THEN (
      CASE WHEN monthly_rental_cost > 0 THEN monthly_rental_cost * 12 ELSE CASE WHEN amortization_months > 0 THEN purchase_cost / amortization_months * 12 ELSE 0 END END
      + annual_insurance + annual_maintenance + annual_tires + annual_technical_inspection
      + CASE WHEN annual_fuel_cost > 0 THEN annual_fuel_cost ELSE estimated_annual_mileage * average_consumption_l_100km * average_fuel_price / 100 END
      + annual_tolls + annual_parking + annual_washing + annual_repairs + annual_other_costs
    ) / estimated_annual_mileage ELSE 0 END
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interventions
  ADD COLUMN IF NOT EXISTS primary_technician_id UUID,
  ADD COLUMN IF NOT EXISTS secondary_technician_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS technician_count NUMERIC NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id),
  ADD COLUMN IF NOT EXISTS travel_mode TEXT NOT NULL DEFAULT 'agency_site_agency',
  ADD COLUMN IF NOT EXISTS route_source_address TEXT,
  ADD COLUMN IF NOT EXISTS route_stock_address TEXT,
  ADD COLUMN IF NOT EXISTS route_client_address TEXT,
  ADD COLUMN IF NOT EXISTS route_next_address TEXT,
  ADD COLUMN IF NOT EXISTS outbound_distance_km NUMERIC,
  ADD COLUMN IF NOT EXISTS return_distance_km NUMERIC,
  ADD COLUMN IF NOT EXISTS outbound_travel_minutes NUMERIC,
  ADD COLUMN IF NOT EXISTS return_travel_minutes NUMERIC,
  ADD COLUMN IF NOT EXISTS manual_vehicle_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS manual_labor_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS manual_travel_labor_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS manual_parts_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS manual_shipping_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS manual_subcontractor_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS manual_admin_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS manual_equipment_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS manual_overhead_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS calculation_status TEXT NOT NULL DEFAULT 'estimated',
  ADD COLUMN IF NOT EXISTS calculation_warnings TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS billed_revenue NUMERIC NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.intervention_technician_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  technician_id UUID, technician_name TEXT, hourly_cost NUMERIC, travel_minutes NUMERIC NOT NULL DEFAULT 0, onsite_minutes NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intervention_parts_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  part_id UUID, designation TEXT NOT NULL, supplier TEXT, purchase_price NUMERIC NOT NULL DEFAULT 0, sale_price NUMERIC NOT NULL DEFAULT 0, quantity NUMERIC NOT NULL DEFAULT 1,
  storage_cost NUMERIC NOT NULL DEFAULT 0, preparation_cost NUMERIC NOT NULL DEFAULT 0, packaging_cost NUMERIC NOT NULL DEFAULT 0, from_internal_stock BOOLEAN NOT NULL DEFAULT false, weighted_average_cost NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intervention_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  carrier TEXT, destination_type TEXT, shipping_cost NUMERIC NOT NULL DEFAULT 0, packaging_cost NUMERIC NOT NULL DEFAULT 0, preparation_cost NUMERIC NOT NULL DEFAULT 0, transport_insurance NUMERIC NOT NULL DEFAULT 0, return_fees NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intervention_subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  subcontractor_name TEXT NOT NULL, service_type TEXT, billed_amount NUMERIC NOT NULL DEFAULT 0, travel_fees NUMERIC NOT NULL DEFAULT 0, material_fees NUMERIC NOT NULL DEFAULT 0, extra_fees NUMERIC NOT NULL DEFAULT 0, invoice_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intervention_equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL, daily_cost NUMERIC NOT NULL DEFAULT 0, hourly_cost NUMERIC NOT NULL DEFAULT 0, fixed_usage_cost NUMERIC NOT NULL DEFAULT 0, delivery_cost NUMERIC NOT NULL DEFAULT 0, external_rental_cost NUMERIC NOT NULL DEFAULT 0, estimated_maintenance_cost NUMERIC NOT NULL DEFAULT 0, deposit_amount NUMERIC NOT NULL DEFAULT 0, usage_hours NUMERIC NOT NULL DEFAULT 0, usage_days NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intervention_type_admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intervention_type TEXT NOT NULL, admin_before_minutes NUMERIC NOT NULL DEFAULT 0, admin_after_minutes NUMERIC NOT NULL DEFAULT 0, admin_hourly_cost NUMERIC NOT NULL DEFAULT 0, planning_minutes NUMERIC NOT NULL DEFAULT 0, quote_minutes NUMERIC NOT NULL DEFAULT 0, part_order_minutes NUMERIC NOT NULL DEFAULT 0, invoicing_minutes NUMERIC NOT NULL DEFAULT 0, closing_minutes NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(owner_id, intervention_type)
);

CREATE INDEX IF NOT EXISTS intervention_technician_times_intervention_idx ON public.intervention_technician_times(intervention_id);
CREATE INDEX IF NOT EXISTS intervention_parts_costs_intervention_idx ON public.intervention_parts_costs(intervention_id);
CREATE INDEX IF NOT EXISTS intervention_shipments_intervention_idx ON public.intervention_shipments(intervention_id);
CREATE INDEX IF NOT EXISTS intervention_subcontractors_intervention_idx ON public.intervention_subcontractors(intervention_id);
CREATE INDEX IF NOT EXISTS intervention_equipments_intervention_idx ON public.intervention_equipments(intervention_id);

ALTER TABLE public.technician_cost_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_technician_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_parts_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_type_admin_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['technician_cost_profiles','vehicles','intervention_technician_times','intervention_parts_costs','intervention_shipments','intervention_subcontractors','intervention_equipments','intervention_type_admin_settings'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s owner access" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s owner access" ON public.%I FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())', t, t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
