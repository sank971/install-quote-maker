-- Champs configurables par type d'installation et valeurs par installation
ALTER TABLE public.installation_types
  ADD COLUMN IF NOT EXISTS component_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.installations
  ADD COLUMN IF NOT EXISTS characteristics JSONB NOT NULL DEFAULT '{}'::jsonb;
