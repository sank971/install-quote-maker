alter table public.installation_parts
  add column if not exists component_type text,
  add column if not exists dimensions text,
  add column if not exists color text,
  add column if not exists reference_override text,
  add column if not exists configuration jsonb not null default '{}'::jsonb;
