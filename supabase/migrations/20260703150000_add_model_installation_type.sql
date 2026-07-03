-- Associe chaque modèle à un type d'installation (ex. Record / Porte coulissante / STA20)
ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES public.installation_types(id) ON DELETE SET NULL;

ALTER TABLE public.models
  DROP CONSTRAINT IF EXISTS models_brand_id_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS models_owner_brand_type_name_key
  ON public.models (owner_id, brand_id, type_id, name);

CREATE INDEX IF NOT EXISTS models_type_id_idx ON public.models (type_id);
