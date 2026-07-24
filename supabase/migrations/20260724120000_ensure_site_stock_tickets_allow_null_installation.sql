-- A site-stock ticket concerns a site storage location rather than an installation.
-- Keep this in a new migration so projects where the earlier schema change was not
-- deployed receive the constraint update as well.
ALTER TABLE public.tickets
  ALTER COLUMN installation_id DROP NOT NULL;

COMMENT ON COLUMN public.tickets.installation_id IS
  'Installation concernée par le ticket. Null pour les tickets stock sur site, qui sont liés au site et au lieu de stock.';
