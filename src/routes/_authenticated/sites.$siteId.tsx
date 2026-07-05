import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useList, useOne } from "@/lib/db-hooks";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, FileText, FolderPlus, History, MapPin, Package, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "@/lib/ticket-workflow";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sites/$siteId")({
  component: SiteDetail,
});

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}

function SiteDetail() {
  const { siteId } = Route.useParams();
  const qc = useQueryClient();
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const { data: site } = useOne<any>("sites", siteId);
  const { data: clients = [] } = useList<any>("clients");
  const { data: installations = [] } = useList<any>("installations", {
    filter: (q) => q.eq("site_id", siteId),
    orderBy: "name",
    ascending: true,
    key: ["installations", "bySite", siteId],
  });
  const { data: types = [] } = useList<any>("installation_types", {
    orderBy: "name",
    ascending: true,
  });
  const { data: brands = [] } = useList<any>("brands", { orderBy: "name", ascending: true });
  const { data: models = [] } = useList<any>("models");
  const { data: quotes = [] } = useList<any>("quotes");
  const { data: quoteItems = [] } = useList<any>("quote_items");
  const { data: parts = [] } = useList<any>("parts", { orderBy: "name", ascending: true });
  const { data: tickets = [] } = useList<any>("tickets", {
    filter: (q) => q.eq("site_id", siteId),
    key: ["tickets", "bySite", siteId],
  });
  const { data: ticketGroups = [] } = useList<any>("ticket_groups", {
    filter: (q) => q.eq("site_id", siteId),
    key: ["ticket_groups", "bySite", siteId],
  });
  const { data: groupTickets = [] } = useList<any>("ticket_group_tickets");
  const { data: quoteTickets = [] } = useList<any>("quote_tickets");
  const { data: reports = [] } = useList<any>("intervention_reports");
  const openTickets = tickets.filter(
    (ticket: any) => !["cloture", "termine"].includes(ticket.status),
  );
  const selectedOpenTickets = openTickets.filter((ticket: any) =>
    selectedTickets.includes(ticket.id),
  );

  const refreshGroups = () =>
    [
      "ticket_groups",
      "ticket_group_tickets",
      "quote_tickets",
      "quotes",
      "quote_installations",
      "tickets",
      "history_events",
    ].forEach((key) => qc.invalidateQueries({ queryKey: [key] }));

  const createSiteFolder = async () => {
    if (selectedOpenTickets.length === 0)
      return toast.error("Sélectionnez au moins un ticket ouvert");
    const owner_id = await currentUserId();
    const { data: group, error } = await (supabase.from("ticket_groups" as any) as any)
      .insert({
        owner_id,
        client_id: site.client_id,
        site_id: site.id,
        title: `Dossier ${site.name}`,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    const { error: linkError } = await (supabase.from("ticket_group_tickets" as any) as any).insert(
      selectedOpenTickets.map((ticket: any) => ({
        owner_id,
        group_id: group.id,
        ticket_id: ticket.id,
      })),
    );
    if (linkError) return toast.error(linkError.message);
    setSelectedTickets([]);
    refreshGroups();
    toast.success("Dossier site créé");
  };

  const addToExistingFolder = async (groupId: string) => {
    if (selectedOpenTickets.length === 0)
      return toast.error("Sélectionnez au moins un ticket ouvert");
    const owner_id = await currentUserId();
    const existing = new Set(groupTickets.map((row: any) => row.ticket_id));
    const rows = selectedOpenTickets
      .filter((ticket: any) => !existing.has(ticket.id))
      .map((ticket: any) => ({ owner_id, group_id: groupId, ticket_id: ticket.id }));
    if (rows.length === 0) return toast.info("Tickets déjà dans un dossier");
    const { error } = await (supabase.from("ticket_group_tickets" as any) as any).insert(rows);
    if (error) return toast.error(error.message);
    setSelectedTickets([]);
    refreshGroups();
    toast.success("Tickets ajoutés au dossier");
  };

  const createGlobalQuote = async (group: any) => {
    const links = groupTickets.filter((row: any) => row.group_id === group.id);
    const folderTickets = links
      .map((row: any) => tickets.find((ticket: any) => ticket.id === row.ticket_id))
      .filter(Boolean);
    if (folderTickets.length === 0) return toast.error("Aucun ticket dans ce dossier");
    const owner_id = await currentUserId();
    const installationIdsForQuote = [
      ...new Set(folderTickets.map((ticket: any) => ticket.installation_id)),
    ];
    const folderReports = reports.filter((report: any) =>
      links.some((link: any) => link.ticket_id === report.ticket_id),
    );
    const notes =
      folderTickets.map((ticket: any) => `${ticket.ticket_number} — ${ticket.title}`).join("\n") +
      (folderReports.length
        ? `\n\nRapports / constats :\n${folderReports.map((report: any) => `- ${report.constat}`).join("\n")}`
        : "");
    const { data: quote, error } = await supabase
      .from("quotes")
      .insert({
        owner_id,
        quote_number: `DEV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        client_id: group.client_id,
        site_id: group.site_id,
        installation_id: installationIdsForQuote[0] ?? null,
        ticket_group_id: group.id,
        vat_rate: 20,
        notes,
      } as any)
      .select()
      .single();
    if (error) return toast.error(error.message);
    await (supabase.from("quote_installations" as any) as any).insert(
      installationIdsForQuote.map((installation_id, position) => ({
        owner_id,
        quote_id: quote.id,
        installation_id,
        position,
      })),
    );
    await (supabase.from("quote_tickets" as any) as any).insert(
      folderTickets.map((ticket: any) => ({ owner_id, quote_id: quote.id, ticket_id: ticket.id })),
    );
    refreshGroups();
    toast.success("Devis global créé");
  };

  if (!site) return <p className="text-muted-foreground">Chargement...</p>;

  const client = clients.find((c: any) => c.id === site.client_id);
  const installationIds = new Set(installations.map((installation: any) => installation.id));
  const siteQuotes = quotes.filter((quote: any) => installationIds.has(quote.installation_id));
  const siteQuoteIds = new Set(siteQuotes.map((quote: any) => quote.id));
  const replacedParts = quoteItems
    .filter((item: any) => item.part_id && siteQuoteIds.has(item.quote_id))
    .map((item: any) => {
      const quote = siteQuotes.find((q: any) => q.id === item.quote_id);
      const installation = installations.find((i: any) => i.id === quote?.installation_id);
      const part = parts.find((p: any) => p.id === item.part_id);
      return { item, quote, installation, part };
    })
    .sort((a: any, b: any) =>
      String(b.quote?.issued_at ?? b.item.created_at).localeCompare(
        String(a.quote?.issued_at ?? a.item.created_at),
      ),
    );

  return (
    <div>
      <Link
        to="/clients/$clientId"
        params={{ clientId: site.client_id }}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> {client?.name ?? "Client"}
      </Link>
      <PageHeader
        title={site.site_number ? `${site.site_number} · ${site.name}` : site.name}
        description={[
          client?.client_number ? `${client.client_number} · ${client.name}` : client?.name,
          site.address,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Informations du site</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Client :</span> {client?.name ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Adresse :</span> {site.address || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Contact :</span> {site.contact_name || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Téléphone :</span> {site.contact_phone || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Email :</span> {site.email || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Notes :</span> {site.notes || "—"}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Tickets ouverts du site</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {openTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun ticket ouvert pour ce site.</p>
          ) : (
            <div className="grid gap-2">
              {openTickets.map((ticket: any) => {
                const installation = installations.find(
                  (item: any) => item.id === ticket.installation_id,
                );
                const checked = selectedTickets.includes(ticket.id);
                return (
                  <label
                    key={ticket.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedTickets((current) =>
                            checked
                              ? current.filter((id) => id !== ticket.id)
                              : [...current, ticket.id],
                          )
                        }
                      />
                      <span>
                        <b>{ticket.ticket_number}</b> · {ticket.title} ·{" "}
                        {installation?.name ?? "Installation"}
                      </span>
                    </span>
                    <Badge>{ticket.status}</Badge>
                  </label>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={createSiteFolder} disabled={selectedTickets.length === 0}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Créer un dossier site
            </Button>
            {ticketGroups
              .filter((group: any) => group.status !== "cloture")
              .map((group: any) => (
                <Button
                  key={group.id}
                  size="sm"
                  variant="outline"
                  onClick={() => addToExistingFolder(group.id)}
                  disabled={selectedTickets.length === 0}
                >
                  Ajouter au dossier existant
                </Button>
              ))}
          </div>
        </CardContent>
      </Card>

      {ticketGroups.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Dossiers site</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {ticketGroups.map((group: any) => {
              const links = groupTickets.filter((row: any) => row.group_id === group.id);
              const groupQuoteIds = new Set(
                quoteTickets
                  .filter((row: any) => links.some((link: any) => link.ticket_id === row.ticket_id))
                  .map((row: any) => row.quote_id),
              );
              return (
                <div key={group.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <b>{group.title ?? "Dossier site"}</b> · {links.length} ticket(s) ·{" "}
                      {groupQuoteIds.size} devis global(aux)
                    </div>
                    <Badge>{group.status}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => createGlobalQuote(group)}>
                      <FileText className="mr-2 h-4 w-4" />
                      Créer un devis global
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Installations ({installations.length})
      </h2>
      {installations.length === 0 ? (
        <EmptyState
          title="Aucune installation"
          description="Ajoutez une installation pour ce site."
        />
      ) : (
        <div className="mb-6 grid gap-3">
          {installations.map((installation: any) => {
            const type = types.find((t: any) => t.id === installation.type_id);
            const brand = brands.find((b: any) => b.id === installation.brand_id);
            const model = models.find((m: any) => m.id === installation.model_id);
            return (
              <Link
                key={installation.id}
                to="/installations/$installationId"
                params={{ installationId: installation.id }}
              >
                <Card className="p-4 transition-colors hover:bg-accent/50">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium">
                        {installation.installation_number
                          ? `${installation.installation_number} · `
                          : ""}
                        {installation.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {[
                          type?.name,
                          brand?.name,
                          model?.name,
                          installation.serial_number && `SN ${installation.serial_number}`,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                      {installation.location && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          <MapPin className="mr-1 inline h-3 w-3" />
                          {installation.location}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <History className="h-4 w-4" />
        Historique des pièces remplacées ({replacedParts.length})
      </h2>
      {replacedParts.length === 0 ? (
        <EmptyState
          title="Aucune pièce remplacée"
          description="Les pièces issues des devis de ce site apparaîtront ici."
        />
      ) : (
        <div className="grid gap-2">
          {replacedParts.map(({ item, quote, installation, part }: any) => (
            <Card key={item.id} className="p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">
                  <Package className="mr-2 inline h-4 w-4 text-primary" />
                  {part?.name ?? item.description}
                </div>
                <Badge variant="secondary">{formatDate(quote?.issued_at ?? item.created_at)}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {installation?.name ?? "Installation"} · Quantité {item.quantity} · Devis{" "}
                {quote?.number ?? quote?.title ?? "—"}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
