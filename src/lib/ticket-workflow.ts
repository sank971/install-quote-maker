/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";

export const ticketStatuses = [
  "nouveau",
  "en_attente_assignation",
  "intervention_planifiee",
  "diagnostic_en_cours",
  "rapport_a_rediger",
  "devis_a_creer",
  "devis_envoye",
  "en_attente_validation_client",
  "devis_accepte",
  "devis_refuse",
  "bon_de_commande_recu",
  "en_attente_pieces",
  "pieces_recues",
  "reparation_a_planifier",
  "reparation_en_cours",
  "probleme_persistant",
  "termine",
  "cloture",
  "annule",
] as const;
export const interventionStatuses = [
  "non_assignee",
  "assignee",
  "planifiee",
  "en_cours",
  "rapport_a_rediger",
  "terminee",
  "echec",
  "annulee",
] as const;
export const interventionTypes = ["diagnostic", "reparation", "controle", "reprise"] as const;
export const quoteWorkflowStatuses = [
  "brouillon",
  "a_envoyer",
  "envoye",
  "vu_client",
  "en_attente_validation",
  "accepte",
  "refuse",
  "expire",
  "annule",
  "converti_en_bon_de_commande",
] as const;
export const partOrderStatuses = [
  "a_commander",
  "commandee",
  "en_attente_reception",
  "partiellement_recue",
  "recue",
  "probleme_fournisseur",
  "annulee",
] as const;

export type TicketStatus = (typeof ticketStatuses)[number];
export type HistoryTarget = {
  ticket_id?: string | null;
  site_id?: string | null;
  installation_id?: string | null;
};

export async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Non authentifié");
  return data.user.id;
}

export async function addHistoryEvent(
  ownerId: string,
  target: HistoryTarget,
  event_type: string,
  title: string,
  description?: string,
  metadata: Record<string, unknown> = {},
) {
  const actor_id = await currentUserId();
  const { error } = await (supabase.from("history_events" as any) as any).insert({
    owner_id: ownerId,
    ...target,
    event_type,
    title,
    description,
    metadata,
    actor_id,
  });
  if (error) throw error;
}

export async function setTicketStatus(
  ticket: any,
  status: TicketStatus,
  eventType: string,
  title: string,
  description?: string,
) {
  const { error } = await (supabase.from("tickets" as any) as any)
    .update({
      status,
      closed_at: status === "cloture" ? new Date().toISOString() : ticket.closed_at,
    })
    .eq("id", ticket.id);
  if (error) throw error;
  await addHistoryEvent(
    ticket.owner_id,
    { ticket_id: ticket.id, site_id: ticket.site_id, installation_id: ticket.installation_id },
    eventType,
    title,
    description,
  );
}

export function canCloseTicket(
  ticket: any,
  interventions: any[],
  reports: any[],
  quotes: any[],
  partOrders: any[],
) {
  const blockingIntervention = interventions.some(
    (i) => !["terminee", "echec", "annulee"].includes(i.status),
  );
  const missingReport = interventions.some(
    (i) =>
      ["terminee", "echec"].includes(i.status) && !reports.some((r) => r.intervention_id === i.id),
  );
  const pendingQuote = quotes.some((q) =>
    ["a_envoyer", "envoye", "vu_client", "en_attente_validation", "sent", "draft"].includes(
      q.status,
    ),
  );
  const pendingParts = partOrders.some((o) => !["recue", "annulee"].includes(o.status));
  const failedWithoutNextStep =
    reports.some((r) => r.reparation_reussie === false) &&
    !interventions.some(
      (i) => i.type === "reparation" && !["terminee", "echec", "annulee"].includes(i.status),
    );
  const reasons = [
    blockingIntervention && "intervention non terminée",
    missingReport && "rapport manquant",
    pendingQuote && "devis en attente",
    pendingParts && "commande de pièces en attente",
    failedWithoutNextStep && "réparation échouée sans suite prévue",
  ].filter(Boolean) as string[];
  return { allowed: reasons.length === 0 && ticket.status !== "cloture", reasons };
}
