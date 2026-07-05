/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus, UserCheck, FileText, PackageCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useList } from "@/lib/db-hooks";
import { supabase } from "@/integrations/supabase/client";
import {
  addHistoryEvent,
  canCloseTicket,
  currentUserId,
  setTicketStatus,
} from "@/lib/ticket-workflow";

export const Route = createFileRoute("/_authenticated/tickets")({ component: TicketsPage });

function num(prefix: string) {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function TicketsPage() {
  const qc = useQueryClient();
  const { data: tickets = [] } = useList<any>("tickets");
  const { data: clients = [] } = useList<any>("clients", { orderBy: "name", ascending: true });
  const { data: sites = [] } = useList<any>("sites", { orderBy: "name", ascending: true });
  const { data: installations = [] } = useList<any>("installations", {
    orderBy: "name",
    ascending: true,
  });
  const { data: interventions = [] } = useList<any>("interventions");
  const { data: reports = [] } = useList<any>("intervention_reports");
  const { data: quotes = [] } = useList<any>("quotes");
  const { data: purchaseOrders = [] } = useList<any>("purchase_orders");
  const { data: partOrders = [] } = useList<any>("part_orders");
  const { data: history = [] } = useList<any>("history_events");
  const { data: suppliers = [] } = useList<any>("suppliers");
  const { data: parts = [] } = useList<any>("parts");
  const [siteSearch, setSiteSearch] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedInstallationIds, setSelectedInstallationIds] = useState<string[]>([]);

  const siteChoices = useMemo(() => {
    const query = siteSearch.trim().toLowerCase();
    return sites.filter((site: any) => {
      const client = clients.find((c: any) => c.id === site.client_id);
      const haystack = [
        site.site_number,
        site.name,
        site.address,
        site.contact_name,
        client?.client_number,
        client?.name,
        client?.address,
        client?.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return !query || haystack.includes(query);
    });
  }, [clients, siteSearch, sites]);

  const selectedSite = sites.find((site: any) => site.id === selectedSiteId);
  const selectedClient = clients.find((client: any) => client.id === selectedSite?.client_id);
  const siteInstallations = installations.filter((i: any) => i.site_id === selectedSiteId);

  const toggleSelectedInstallation = (installationId: string) => {
    setSelectedInstallationIds((current) =>
      current.includes(installationId)
        ? current.filter((id) => id !== installationId)
        : [...current, installationId],
    );
  };

  const chooseSite = (siteId: string) => {
    setSelectedSiteId(siteId);
    setSelectedInstallationIds([]);
  };

  const invalidate = () =>
    [
      "tickets",
      "interventions",
      "intervention_reports",
      "quotes",
      "purchase_orders",
      "part_orders",
      "history_events",
      "installation_parts",
      "ticket_groups",
      "ticket_group_tickets",
    ].forEach((t) => qc.invalidateQueries({ queryKey: [t] }));

  const createTicket = useMutation({
    mutationFn: async (e: any) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const owner_id = await currentUserId();
      const site = sites.find((s: any) => s.id === selectedSiteId);
      if (!site) throw new Error("Sélectionnez d’abord un client ou un site");
      if (selectedInstallationIds.length === 0) {
        throw new Error("Sélectionnez au moins une installation du site");
      }

      const title = String(fd.get("title") || "").trim();
      const description = String(fd.get("description") || "").trim();
      let group: any = null;

      if (selectedInstallationIds.length > 1) {
        const { data, error } = await (supabase.from("ticket_groups" as any) as any)
          .insert({
            owner_id,
            client_id: site.client_id,
            site_id: site.id,
            title,
            status: "ouvert",
          })
          .select()
          .single();
        if (error) throw error;
        group = data;
      }

      for (const installationId of selectedInstallationIds) {
        const installation = installations.find((i: any) => i.id === installationId);
        if (!installation || installation.site_id !== site.id) continue;
        const payload = {
          owner_id,
          ticket_number: num("TCK"),
          title,
          description,
          client_id: site.client_id,
          site_id: site.id,
          installation_id: installation.id,
          status: "en_attente_assignation",
        };
        const { data: ticket, error } = await (supabase.from("tickets" as any) as any)
          .insert(payload)
          .select()
          .single();
        if (error) throw error;

        if (group) {
          const { error: groupError } = await (
            supabase.from("ticket_group_tickets" as any) as any
          ).insert({ owner_id, group_id: group.id, ticket_id: ticket.id });
          if (groupError) throw groupError;
        }

        await addHistoryEvent(
          owner_id,
          { ticket_id: ticket.id, site_id: site.id, installation_id: installation.id },
          "ticket_created",
          group ? "Ticket créé et lié au dossier site" : "Ticket créé",
          String(payload.title),
          group ? { ticket_group_id: group.id } : {},
        );
        const { error: iErr } = await (supabase.from("interventions" as any) as any).insert({
          owner_id,
          ticket_id: ticket.id,
          site_id: site.id,
          installation_id: installation.id,
          title: `Diagnostic ${ticket.ticket_number}`,
          type: "diagnostic",
          status: "non_assignee",
          description: payload.description,
        });
        if (iErr) throw iErr;
        await addHistoryEvent(
          owner_id,
          { ticket_id: ticket.id, site_id: site.id, installation_id: installation.id },
          "intervention_created",
          "Intervention de diagnostic créée",
          group ? "Ticket lié automatiquement aux autres installations sélectionnées" : undefined,
          group ? { ticket_group_id: group.id } : {},
        );
      }
      const ticketCount = selectedInstallationIds.length;
      (e.target as HTMLFormElement).reset();
      setSelectedInstallationIds([]);
      return ticketCount;
    },
    onSuccess: (ticketCount) => {
      invalidate();
      toast.success(ticketCount > 1 ? "Tickets créés et liés" : "Ticket créé");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const assign = async (ticket: any, intervention: any) => {
    const user = await currentUserId();
    const { error } = await (supabase.from("interventions" as any) as any)
      .update({ status: "assignee", technician_id: user })
      .eq("id", intervention.id);
    if (error) throw error;
    await addHistoryEvent(
      ticket.owner_id,
      { ticket_id: ticket.id, site_id: ticket.site_id, installation_id: ticket.installation_id },
      "intervention_assigned",
      "Intervention assignée",
    );
    invalidate();
  };
  const updateIntervention = async (ticket: any, intervention: any, status: string) => {
    const patch: any = { status };
    if (status === "en_cours") patch.started_at = new Date().toISOString();
    if (["terminee", "echec"].includes(status)) patch.completed_at = new Date().toISOString();
    const { error } = await (supabase.from("interventions" as any) as any)
      .update(patch)
      .eq("id", intervention.id);
    if (error) throw error;
    await setTicketStatus(
      ticket,
      status === "en_cours"
        ? intervention.type === "reparation"
          ? "reparation_en_cours"
          : "diagnostic_en_cours"
        : status === "rapport_a_rediger"
          ? "rapport_a_rediger"
          : ticket.status,
      `intervention_${status}`,
      `Intervention ${status}`,
    );
    invalidate();
  };
  const createReport = async (e: any, ticket: any, intervention: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const owner_id = await currentUserId();
    const ok = fd.get("reparation_reussie") === "true";
    const partId = fd.get("part_id");
    const successParts = partId
      ? [{ part_id: partId, quantity: Number(fd.get("quantity") || 1) }]
      : [];
    const report = {
      owner_id,
      ticket_id: ticket.id,
      intervention_id: intervention.id,
      site_id: ticket.site_id,
      installation_id: ticket.installation_id,
      technician_id: intervention.technician_id,
      constat: fd.get("constat"),
      actions_realisees: fd.get("actions"),
      conclusion: fd.get("conclusion"),
      reparation_reussie: fd.get("reparation_reussie") ? ok : null,
      besoin_devis: fd.get("besoin_devis") === "on",
      besoin_commande_pieces: fd.get("besoin_commande_pieces") === "on",
      pieces_remplacees_succes: successParts,
    };
    const { error } = await (supabase.from("intervention_reports" as any) as any).insert(report);
    if (error) throw error;
    await addHistoryEvent(
      owner_id,
      { ticket_id: ticket.id, site_id: ticket.site_id, installation_id: ticket.installation_id },
      "report_created",
      "Rapport créé",
    );
    if (ok && partId)
      await (supabase.from("installation_parts" as any) as any).upsert(
        {
          owner_id,
          installation_id: ticket.installation_id,
          part_id: partId,
          quantity: Number(fd.get("quantity") || 1),
          ticket_id: ticket.id,
          intervention_id: intervention.id,
          technician_id: intervention.technician_id,
          replaced_at: new Date().toISOString(),
        },
        { onConflict: "installation_id,part_id" },
      );
    await setTicketStatus(
      ticket,
      report.besoin_devis
        ? "devis_a_creer"
        : report.besoin_commande_pieces
          ? "en_attente_pieces"
          : ok
            ? "termine"
            : "probleme_persistant",
      ok ? "repair_success" : "repair_failed",
      ok ? "Réparation réussie" : "Rapport traité",
    );
    e.currentTarget.reset();
    invalidate();
  };
  const createPO = async (ticket: any, quote: any) => {
    const owner_id = await currentUserId();
    const { error } = await (supabase.from("purchase_orders" as any) as any).insert({
      owner_id,
      ticket_id: ticket.id,
      quote_id: quote.id,
      order_number: num("BC"),
    });
    if (error) throw error;
    await (supabase.from("quotes" as any) as any)
      .update({ status: "converti_en_bon_de_commande" })
      .eq("id", quote.id);
    await setTicketStatus(
      ticket,
      "bon_de_commande_recu",
      "purchase_order_created",
      "Bon de commande créé",
    );
    invalidate();
  };
  const createPartOrder = async (e: any, ticket: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const owner_id = await currentUserId();
    const { data: po, error } = await (supabase.from("part_orders" as any) as any)
      .insert({
        owner_id,
        ticket_id: ticket.id,
        installation_id: ticket.installation_id,
        supplier_id: fd.get("supplier_id") || null,
        status: "a_commander",
      })
      .select()
      .single();
    if (error) throw error;
    const part = parts.find((p: any) => p.id === fd.get("part_id"));
    await (supabase.from("part_order_items" as any) as any).insert({
      owner_id,
      part_order_id: po.id,
      part_id: part?.id,
      designation: part?.name ?? "Pièce",
      reference: part?.reference,
      quantity: Number(fd.get("quantity") || 1),
    });
    await setTicketStatus(
      ticket,
      "en_attente_pieces",
      "part_order_created",
      "Commande de pièces créée",
    );
    e.currentTarget.reset();
    invalidate();
  };
  const markReceived = async (ticket: any, order: any) => {
    const { error } = await (supabase.from("part_orders" as any) as any)
      .update({ status: "recue", received_at: new Date().toISOString().slice(0, 10) })
      .eq("id", order.id);
    if (error) throw error;
    await setTicketStatus(ticket, "pieces_recues", "parts_received", "Pièces reçues");
    invalidate();
  };
  const createRepair = async (ticket: any) => {
    const owner_id = await currentUserId();
    const { error } = await (supabase.from("interventions" as any) as any).insert({
      owner_id,
      ticket_id: ticket.id,
      site_id: ticket.site_id,
      installation_id: ticket.installation_id,
      title: `Réparation ${ticket.ticket_number}`,
      type: "reparation",
      status: "non_assignee",
    });
    if (error) throw error;
    await setTicketStatus(
      ticket,
      "reparation_a_planifier",
      "repair_intervention_created",
      "Intervention de réparation créée",
    );
    invalidate();
  };
  const close = async (ticket: any) => {
    const related = (a: any[]) => a.filter((x: any) => x.ticket_id === ticket.id);
    const c = canCloseTicket(
      ticket,
      related(interventions),
      related(reports),
      related(quotes),
      related(partOrders),
    );
    if (!c.allowed) return toast.error(`Clôture impossible : ${c.reasons.join(", ")}`);
    await setTicketStatus(ticket, "cloture", "ticket_closed", "Ticket clôturé");
    invalidate();
  };

  return (
    <div>
      <PageHeader
        title="Tickets"
        description="Flux diagnostic, devis, pièces, réparation et clôture"
      />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Créer un ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => createTicket.mutate(e)} className="grid gap-4">
            <div className="grid gap-2">
              <Label>1. Rechercher puis choisir le client ou le site</Label>
              <Input
                value={siteSearch}
                onChange={(e) => setSiteSearch(e.target.value)}
                placeholder="Nom, numéro client/site, adresse..."
              />
              <div className="grid max-h-56 gap-2 overflow-auto rounded-md border p-2">
                {siteChoices.map((site: any) => {
                  const client = clients.find((c: any) => c.id === site.client_id);
                  return (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => chooseSite(site.id)}
                      className={`rounded-md border p-3 text-left text-sm transition hover:bg-muted ${
                        selectedSiteId === site.id ? "border-primary bg-muted" : ""
                      }`}
                    >
                      <b>{client?.name ?? "Client"}</b>
                      <span className="text-muted-foreground">
                        {client?.client_number ? ` · ${client.client_number}` : ""}
                      </span>
                      <div>
                        {site.name}
                        {site.site_number ? ` · ${site.site_number}` : ""}
                      </div>
                      {site.address ? (
                        <div className="text-xs text-muted-foreground">{site.address}</div>
                      ) : null}
                    </button>
                  );
                })}
                {siteChoices.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">Aucun client/site trouvé.</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>2. Sélectionner les installations du site concerné</Label>
              {selectedSite ? (
                <div className="rounded-md border p-3">
                  <p className="mb-2 text-sm text-muted-foreground">
                    {selectedClient?.name} · {selectedSite.name}
                  </p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {siteInstallations.map((installation: any) => (
                      <label key={installation.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedInstallationIds.includes(installation.id)}
                          onChange={() => toggleSelectedInstallation(installation.id)}
                        />
                        {installation.name}
                      </label>
                    ))}
                  </div>
                  {siteInstallations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune installation n’est rattachée à ce site.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="rounded-md border p-3 text-sm text-muted-foreground">
                  Choisissez d’abord un client ou un site dans la liste ci-dessus.
                </p>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Titre</Label>
                <Input name="title" required />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Input name="description" />
              </div>
            </div>
            <Button disabled={!selectedSiteId || selectedInstallationIds.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              {selectedInstallationIds.length > 1
                ? `Créer ${selectedInstallationIds.length} tickets liés + diagnostics`
                : "Créer + diagnostic"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Interventions non assignées</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {interventions
            .filter((i: any) => i.status === "non_assignee")
            .map((i: any) => {
              const t = tickets.find((x: any) => x.id === i.ticket_id);
              return (
                <div
                  key={i.id}
                  className="flex items-center justify-between rounded border p-2 text-sm"
                >
                  <span>
                    {i.title} · {i.type}
                  </span>
                  <Button size="sm" onClick={() => assign(t, i)}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    M’assigner
                  </Button>
                </div>
              );
            })}
        </CardContent>
      </Card>
      {tickets.length === 0 ? (
        <EmptyState title="Aucun ticket" />
      ) : (
        <div className="grid gap-4">
          {tickets.map((t: any) => {
            const ti = interventions.filter((i: any) => i.ticket_id === t.id),
              tr = reports.filter((r: any) => r.ticket_id === t.id),
              tq = quotes.filter((q: any) => q.ticket_id === t.id),
              tpo = purchaseOrders.filter((p: any) => p.ticket_id === t.id),
              tparts = partOrders.filter((p: any) => p.ticket_id === t.id),
              site = sites.find((s: any) => s.id === t.site_id),
              inst = installations.find((i: any) => i.id === t.installation_id);
            return (
              <Card key={t.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                    <span>
                      <ClipboardList className="mr-2 inline h-4 w-4" />
                      {t.ticket_number} · {t.title}
                    </span>
                    <Badge>{t.status}</Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {site?.name} · {inst?.name}
                  </p>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-2">
                    {ti.map((i: any) => (
                      <div key={i.id} className="rounded-md border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <b>{i.title}</b>
                          <Badge variant="outline">
                            {i.type} · {i.status}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {["planifiee", "en_cours", "rapport_a_rediger", "terminee", "echec"].map(
                            (s) => (
                              <Button
                                key={s}
                                size="sm"
                                variant="outline"
                                onClick={() => updateIntervention(t, i, s)}
                              >
                                {s}
                              </Button>
                            ),
                          )}
                        </div>
                        <form
                          onSubmit={(e) => createReport(e, t, i)}
                          className="mt-3 grid gap-2 md:grid-cols-3"
                        >
                          <Input name="constat" placeholder="Constat" required />
                          <Input name="actions" placeholder="Actions réalisées" />
                          <Input name="conclusion" placeholder="Conclusion" />
                          <Select name="reparation_reussie">
                            <SelectTrigger>
                              <SelectValue placeholder="Réparation réussie ?" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Oui</SelectItem>
                              <SelectItem value="false">Non</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select name="part_id">
                            <SelectTrigger>
                              <SelectValue placeholder="Pièce remplacée avec succès" />
                            </SelectTrigger>
                            <SelectContent>
                              {parts.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input name="quantity" type="number" step="1" placeholder="Qté" />
                          <label className="text-sm">
                            <input name="besoin_devis" type="checkbox" /> Besoin devis
                          </label>
                          <label className="text-sm">
                            <input name="besoin_commande_pieces" type="checkbox" /> Besoin pièces
                          </label>
                          <Button size="sm">
                            <FileText className="mr-2 h-4 w-4" />
                            Créer rapport
                          </Button>
                        </form>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tq
                      .filter((q: any) => q.status === "accepte")
                      .map((q: any) => (
                        <Button key={q.id} size="sm" onClick={() => createPO(t, q)}>
                          Créer bon de commande
                        </Button>
                      ))}
                    <form onSubmit={(e) => createPartOrder(e, t)} className="flex flex-wrap gap-2">
                      <Select name="supplier_id">
                        <SelectTrigger className="w-44">
                          <SelectValue placeholder="Fournisseur" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select name="part_id" required>
                        <SelectTrigger className="w-44">
                          <SelectValue placeholder="Pièce" />
                        </SelectTrigger>
                        <SelectContent>
                          {parts.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input className="w-20" name="quantity" type="number" defaultValue="1" />
                      <Button size="sm" variant="outline">
                        <PackageCheck className="mr-2 h-4 w-4" />
                        Commander
                      </Button>
                    </form>
                    {tparts.map((o: any) => (
                      <Button
                        key={o.id}
                        size="sm"
                        variant="outline"
                        onClick={() => markReceived(t, o)}
                        disabled={o.status === "recue"}
                      >
                        Marquer pièces reçues
                      </Button>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => createRepair(t)}>
                      Créer réparation
                    </Button>
                    <Button size="sm" onClick={() => close(t)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Clôturer
                    </Button>
                  </div>
                  <div>
                    <b className="text-sm">Historique</b>
                    {history
                      .filter((h: any) => h.ticket_id === t.id)
                      .slice(0, 6)
                      .map((h: any) => (
                        <p key={h.id} className="text-xs text-muted-foreground">
                          {new Date(h.created_at).toLocaleString("fr-FR")} · {h.title}
                        </p>
                      ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
