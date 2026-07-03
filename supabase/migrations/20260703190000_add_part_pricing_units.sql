alter table public.parts
  add column if not exists pricing_unit text not null default 'unit'
  check (pricing_unit in ('unit', 'linear_meter'));

alter table public.installation_parts
  add column if not exists length_meters numeric(10,2),
  add constraint installation_parts_length_meters_non_negative
    check (length_meters is null or length_meters >= 0);
