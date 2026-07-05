/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus, Search, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useList } from "@/lib/db-hooks";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "@/lib/ticket-workflow";

export const Route = createFileRoute("/_authenticated/tickets")({ 
  component: TicketsPage 
});

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
  
  const [siteSearch, setSiteSearch] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedInstallationIds, setSelectedInstallationIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

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

  // Filter tickets based on search query
  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return tickets;
    
    return tickets.filter((ticket: any) => {
      const site = sites.find((s: any) => s.id === ticket.site_id);
      const haystack = [
        ticket.ticket_number,
        ticket.title,
        site?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [tickets, searchQuery, sites]);

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
    mutationFn: async (form: HTMLFormElement) => {
      const fd = new FormData(form);
      const owner_id = await currentUserId();
      const site = sites.find((s: any) => s.id === selectedSiteId);
      if (!site) throw new Error("Sélectionnez d'abord un client ou un site");
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
        const { data: ticket, error } = await (supabase.rpc as any)(
          "create_ticket_with_diagnostic",
          {
            p_client_id: site.client_id,
            p_site_id: site.id,
            p_installation_id: installation.id,
            p_ticket_number: num("TCK"),
            p_title: title,
            p_description: description || null,
            p_ticket_group_id: group?.id ?? null,
          },
        );
        if (error) throw error;
        if (!ticket) throw new Error("Le ticket n'a pas pu être créé");
      }
      const ticketCount = selectedInstallationIds.length;
      form.reset();
      setSelectedInstallationIds([]);
      setShowCreateForm(false);
      return ticketCount;
    },
    onSuccess: (ticketCount) => {
      invalidate();
      toast.success(ticketCount > 1 ? "Tickets créés et liés" : "Ticket créé");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Status label colors
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "en_attente_assignation": "bg-gray-100 text-gray-800",
      "diagnostic_en_cours": "bg-blue-100 text-blue-800",
      "diagnostic_termine": "bg-blue-200 text-blue-900",
      "rapport_a_rediger": "bg-yellow-100 text-yellow-800",
      "devis_a_creer": "bg-orange-100 text-orange-800",
      "en_attente_pieces": "bg-orange-100 text-orange-800",
      "pieces_recues": "bg-green-100 text-green-800",
      "reparation_a_planifier": "bg-purple-100 text-purple-800",
      "reparation_en_cours": "bg-purple-200 text-purple-900",
      "bon_de_commande_recu": "bg-green-200 text-green-900",
      "probleme_persistant": "bg-red-100 text-red-800",
      "termine": "bg-green-300 text-green-900",
      "cloture": "bg-gray-300 text-gray-900",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div>
      <PageHeader
        title="Tickets"
        description="Gestion des tickets de diagnostic, devis, pièces et réparations"
      />

      {/* Create Ticket Button */}
      <div className="mb-6 flex justify-end">
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          {showCreateForm ? "Fermer" : "Créer un ticket"}
        </Button>
      </div>

      {/* Create Ticket Form */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Créer un ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTicket.mutate(e.currentTarget);
              }}
              className="grid gap-4"
            >
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
                        Aucune installation n'est rattachée à ce site.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-md border p-3 text-sm text-muted-foreground">
                    Choisissez d'abord un client ou un site dans la liste ci-dessus.
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
      )}

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numéro, titre ou site..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <EmptyState 
          title="Aucun ticket" 
          description={searchQuery ? "Aucun ticket ne correspond à votre recherche." : "Créez votre premier ticket pour commencer."}
        />
      ) : (
        <div className="space-y-2">
          {filteredTickets.map((ticket: any) => {
            const site = sites.find((s: any) => s.id === ticket.site_id);
            const installation = installations.find((i: any) => i.id === ticket.installation_id);
            
            return (
              <Link 
                key={ticket.id}
                to="/tickets/$ticketId"
                params={{ ticketId: ticket.id }}
              >
                <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex flex-1 items-center gap-4 min-w-0">
                      <ClipboardList className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">
                          {ticket.ticket_number}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {site?.name ? `${site.name}` : "Site"}
                          {installation?.name && ` · ${installation.name}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
