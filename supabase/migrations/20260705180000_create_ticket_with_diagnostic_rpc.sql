-- Création atomique d'un ticket avec son diagnostic initial.
CREATE OR REPLACE FUNCTION public.create_ticket_with_diagnostic(
  p_client_id UUID,
  p_site_id UUID,
  p_installation_id UUID,
  p_ticket_number TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_ticket_group_id UUID DEFAULT NULL
)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID := auth.uid();
  v_ticket public.tickets;
  v_installation_site UUID;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT site_id INTO v_installation_site
  FROM public.installations
  WHERE id = p_installation_id AND owner_id = v_owner;

  IF v_installation_site IS NULL OR v_installation_site <> p_site_id THEN
    RAISE EXCEPTION 'Installation introuvable pour ce site';
  END IF;

  INSERT INTO public.tickets (
    owner_id,
    ticket_number,
    title,
    description,
    client_id,
    site_id,
    installation_id,
    status
  ) VALUES (
    v_owner,
    p_ticket_number,
    p_title,
    p_description,
    p_client_id,
    p_site_id,
    p_installation_id,
    'en_attente_assignation'
  )
  RETURNING * INTO v_ticket;

  IF p_ticket_group_id IS NOT NULL THEN
    INSERT INTO public.ticket_group_tickets (owner_id, group_id, ticket_id)
    SELECT v_owner, p_ticket_group_id, v_ticket.id
    FROM public.ticket_groups
    WHERE id = p_ticket_group_id AND owner_id = v_owner;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Dossier site introuvable';
    END IF;
  END IF;

  INSERT INTO public.history_events (
    owner_id,
    ticket_id,
    site_id,
    installation_id,
    event_type,
    title,
    description,
    metadata,
    actor_id,
    ticket_group_id
  ) VALUES (
    v_owner,
    v_ticket.id,
    p_site_id,
    p_installation_id,
    'ticket_created',
    CASE WHEN p_ticket_group_id IS NULL THEN 'Ticket créé' ELSE 'Ticket créé et lié au dossier site' END,
    p_title,
    CASE WHEN p_ticket_group_id IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('ticket_group_id', p_ticket_group_id) END,
    v_owner,
    p_ticket_group_id
  );

  INSERT INTO public.interventions (
    owner_id,
    ticket_id,
    site_id,
    installation_id,
    title,
    type,
    status,
    description
  ) VALUES (
    v_owner,
    v_ticket.id,
    p_site_id,
    p_installation_id,
    'Diagnostic ' || v_ticket.ticket_number,
    'diagnostic',
    'non_assignee',
    p_description
  );

  INSERT INTO public.history_events (
    owner_id,
    ticket_id,
    site_id,
    installation_id,
    event_type,
    title,
    description,
    metadata,
    actor_id,
    ticket_group_id
  ) VALUES (
    v_owner,
    v_ticket.id,
    p_site_id,
    p_installation_id,
    'intervention_created',
    'Intervention de diagnostic créée',
    CASE WHEN p_ticket_group_id IS NULL THEN NULL ELSE 'Ticket lié automatiquement aux autres installations sélectionnées' END,
    CASE WHEN p_ticket_group_id IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('ticket_group_id', p_ticket_group_id) END,
    v_owner,
    p_ticket_group_id
  );

  RETURN v_ticket;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_ticket_with_diagnostic(UUID, UUID, UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;
