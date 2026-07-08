-- Les stocks sur site doivent reprendre l'adresse complète et la géolocalisation du site.
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

CREATE OR REPLACE FUNCTION public.ensure_site_storage_location(p_site_id UUID, p_owner_id UUID DEFAULT auth.uid())
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE loc_id UUID; site_row RECORD;
BEGIN
  SELECT * INTO site_row FROM public.sites WHERE id = p_site_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Site introuvable'; END IF;

  SELECT id INTO loc_id
  FROM public.storage_locations
  WHERE site_id = p_site_id AND type = 'site' AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF loc_id IS NULL THEN
    INSERT INTO public.storage_locations(owner_id, site_id, name, type, address, postal_code, city, country, latitude, longitude, is_active)
    VALUES (
      COALESCE(p_owner_id, site_row.owner_id),
      p_site_id,
      'Stock site · ' || COALESCE(site_row.name, 'Site'),
      'site',
      COALESCE(site_row.address, 'Adresse site à compléter'),
      null,
      null,
      'France',
      site_row.latitude,
      site_row.longitude,
      true
    )
    RETURNING id INTO loc_id;
  ELSE
    UPDATE public.storage_locations
    SET address = COALESCE(site_row.address, address, 'Adresse site à compléter'),
        latitude = site_row.latitude,
        longitude = site_row.longitude
    WHERE id = loc_id;
  END IF;

  RETURN loc_id;
END $$;

GRANT EXECUTE ON FUNCTION public.ensure_site_storage_location(UUID, UUID) TO authenticated, service_role;
