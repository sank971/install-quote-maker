-- Numéros de tickets simples: tck-000001, tck-000002, ... par propriétaire.
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS ticket_sequence INT;

WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY owner_id ORDER BY created_at, id)::INT AS seq
  FROM public.tickets
  WHERE ticket_sequence IS NULL
)
UPDATE public.tickets t
SET ticket_sequence = numbered.seq,
    ticket_number = 'tck-' || lpad(numbered.seq::TEXT, 6, '0')
FROM numbered
WHERE t.id = numbered.id;

CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_sequence IS NULL THEN
    NEW.ticket_sequence := public.next_owner_sequence('tickets', 'ticket_sequence', NEW.owner_id);
  END IF;
  NEW.ticket_number := 'tck-' || lpad(NEW.ticket_sequence::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t_tickets_number ON public.tickets;
CREATE TRIGGER t_tickets_number
  BEFORE INSERT OR UPDATE OF owner_id, ticket_sequence ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_ticket_number();

ALTER TABLE public.tickets
  ALTER COLUMN ticket_sequence SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tickets_owner_ticket_sequence_key ON public.tickets (owner_id, ticket_sequence);
CREATE UNIQUE INDEX IF NOT EXISTS tickets_owner_ticket_number_key ON public.tickets (owner_id, ticket_number);
