-- Numérotation automatique des clients, sites et installations.
-- Clients/sites: numéros à 5 chiffres par propriétaire (00001, 00002, ...).
-- Installations: numéro composé du numéro de site et d'un compteur à 3 chiffres par site (00001/001, ...).

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_sequence INT,
  ADD COLUMN IF NOT EXISTS client_number TEXT;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS site_sequence INT,
  ADD COLUMN IF NOT EXISTS site_number TEXT;

ALTER TABLE public.installations
  ADD COLUMN IF NOT EXISTS installation_sequence INT,
  ADD COLUMN IF NOT EXISTS installation_number TEXT;

CREATE OR REPLACE FUNCTION public.next_owner_sequence(table_name TEXT, sequence_column TEXT, target_owner UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_value INT;
BEGIN
  EXECUTE format('SELECT COALESCE(MAX(%I), 0) + 1 FROM public.%I WHERE owner_id = $1', sequence_column, table_name)
    INTO next_value
    USING target_owner;
  RETURN next_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_client_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_sequence IS NULL THEN
    NEW.client_sequence := public.next_owner_sequence('clients', 'client_sequence', NEW.owner_id);
  END IF;
  NEW.client_number := lpad(NEW.client_sequence::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_site_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.site_sequence IS NULL THEN
    NEW.site_sequence := public.next_owner_sequence('sites', 'site_sequence', NEW.owner_id);
  END IF;
  NEW.site_number := lpad(NEW.site_sequence::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_installation_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_site_number TEXT;
BEGIN
  SELECT site_number INTO parent_site_number FROM public.sites WHERE id = NEW.site_id;

  IF parent_site_number IS NULL THEN
    RAISE EXCEPTION 'Le site % doit avoir un numéro avant de numéroter une installation', NEW.site_id;
  END IF;

  IF NEW.installation_sequence IS NULL OR (TG_OP = 'UPDATE' AND NEW.site_id IS DISTINCT FROM OLD.site_id) THEN
    SELECT COALESCE(MAX(installation_sequence), 0) + 1
      INTO NEW.installation_sequence
      FROM public.installations
      WHERE site_id = NEW.site_id
        AND id IS DISTINCT FROM NEW.id;
  END IF;

  NEW.installation_number := parent_site_number || '/' || lpad(NEW.installation_sequence::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t_clients_number ON public.clients;
CREATE TRIGGER t_clients_number
  BEFORE INSERT OR UPDATE OF owner_id, client_sequence ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_client_number();

DROP TRIGGER IF EXISTS t_sites_number ON public.sites;
CREATE TRIGGER t_sites_number
  BEFORE INSERT OR UPDATE OF owner_id, site_sequence ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.set_site_number();

DROP TRIGGER IF EXISTS t_installations_number ON public.installations;
CREATE TRIGGER t_installations_number
  BEFORE INSERT OR UPDATE OF site_id, installation_sequence ON public.installations
  FOR EACH ROW EXECUTE FUNCTION public.set_installation_number();

WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY owner_id ORDER BY created_at, id)::INT AS seq
  FROM public.clients
  WHERE client_sequence IS NULL
)
UPDATE public.clients c
SET client_sequence = numbered.seq,
    client_number = lpad(numbered.seq::TEXT, 5, '0')
FROM numbered
WHERE c.id = numbered.id;

WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY owner_id ORDER BY created_at, id)::INT AS seq
  FROM public.sites
  WHERE site_sequence IS NULL
)
UPDATE public.sites s
SET site_sequence = numbered.seq,
    site_number = lpad(numbered.seq::TEXT, 5, '0')
FROM numbered
WHERE s.id = numbered.id;

WITH numbered AS (
  SELECT i.id,
         row_number() OVER (PARTITION BY i.site_id ORDER BY i.created_at, i.id)::INT AS seq,
         s.site_number
  FROM public.installations i
  JOIN public.sites s ON s.id = i.site_id
  WHERE i.installation_sequence IS NULL
)
UPDATE public.installations i
SET installation_sequence = numbered.seq,
    installation_number = numbered.site_number || '/' || lpad(numbered.seq::TEXT, 3, '0')
FROM numbered
WHERE i.id = numbered.id;

ALTER TABLE public.clients
  ALTER COLUMN client_sequence SET NOT NULL,
  ALTER COLUMN client_number SET NOT NULL;

ALTER TABLE public.sites
  ALTER COLUMN site_sequence SET NOT NULL,
  ALTER COLUMN site_number SET NOT NULL;

ALTER TABLE public.installations
  ALTER COLUMN installation_sequence SET NOT NULL,
  ALTER COLUMN installation_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_owner_client_sequence_key ON public.clients (owner_id, client_sequence);
CREATE UNIQUE INDEX IF NOT EXISTS clients_owner_client_number_key ON public.clients (owner_id, client_number);
CREATE UNIQUE INDEX IF NOT EXISTS sites_owner_site_sequence_key ON public.sites (owner_id, site_sequence);
CREATE UNIQUE INDEX IF NOT EXISTS sites_owner_site_number_key ON public.sites (owner_id, site_number);
CREATE UNIQUE INDEX IF NOT EXISTS installations_site_installation_sequence_key ON public.installations (site_id, installation_sequence);
CREATE UNIQUE INDEX IF NOT EXISTS installations_site_installation_number_key ON public.installations (site_id, installation_number);
