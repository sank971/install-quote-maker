-- Les tickets/devis de stock sur site sont liés au site et au stock, jamais à une installation.
ALTER TABLE public.tickets
  ALTER COLUMN installation_id DROP NOT NULL;

COMMENT ON COLUMN public.tickets.installation_id IS
  'Installation concernée par le ticket. Null pour les tickets stock sur site, qui sont liés au site et au lieu de stock.';
