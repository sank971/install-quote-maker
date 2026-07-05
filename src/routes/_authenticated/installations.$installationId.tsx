import { createFileRoute, Link } from "@tanstack/react-router";
import { useList, useOne } from "@/lib/db-hooks";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ClipboardList, History, Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/installations/$installationId")({
  component: InstallationDetail,
});

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}

function InstallationDetail() {
  const { installationId } = Route.useParams();
  const { data: installation } = useOne<any>("installations", installationId);
  const { data: sites = [] } = useList<any>("sites");
  const { data: clients = [] } = useList<any>("clients");
  const { data: types = [] } = useList<any>("installation_types", {
    orderBy: "name",
    ascending: true,
  });
  const { data: brands = [] } = useList<any>("brands", { orderBy: "name", ascending: true });
  const { data: models = [] } = useList<any>("models");
  const { data: contracts = [] } = useList<any>("contracts");
  const { data: interventions = [] } = useList<any>("interventions", {
    filter: (q) => q.eq("installation_id", installationId),
    orderBy: "date",
    key: ["interventions", "byInstallation", installationId],
  });
  const { data: quotes = [] } = useList<any>("quotes", {
    filter: (q) => q.eq("installation_id", installationId),
    orderBy: "issued_at",
    key: ["quotes", "byInstallation", installationId],
  });
  const { data: quoteItems = [] } = useList<any>("quote_items");
  const { data: allQuotes = [] } = useList<any>("quotes");
  const { data: quoteInstallations = [] } = useList<any>("quote_installations", {
    filter: (q) => q.eq("installation_id", installationId),
    key: ["quote_installations", "byInstallation", installationId],
  });
  const { data: tickets = [] } = useList<any>("tickets", {
    filter: (q) => q.eq("installation_id", installationId),
    key: ["tickets", "byInstallation", installationId],
  });
  const { data: quoteTickets = [] } = useList<any>("quote_tickets");
  const { data: parts = [] } = useList<any>("parts", { orderBy: "name", ascending: true });
  const { data: installationParts = [] } = useList<any>("installation_parts");

  if (!installation) return <p className="text-muted-foreground">Chargement...</p>;

  const site = sites.find((s: any) => s.id === installation.site_id);
  const client = clients.find((c: any) => c.id === site?.client_id);
  const type = types.find((t: any) => t.id === installation.type_id);
  const brand = brands.find((b: any) => b.id === installation.brand_id);
  const model = models.find((m: any) => m.id === installation.model_id);
  const contract = contracts.find((c: any) => c.id === installation.contract_id);
  const quoteIds = new Set(quotes.map((quote: any) => quote.id));
  const replacedParts = quoteItems
    .filter((item: any) => item.part_id && quoteIds.has(item.quote_id))
    .map((item: any) => ({
      item,
      quote: quotes.find((q: any) => q.id === item.quote_id),
      part: parts.find((p: any) => p.id === item.part_id),
    }))
    .sort((a: any, b: any) =>
      String(b.quote?.issued_at ?? b.item.created_at).localeCompare(
        String(a.quote?.issued_at ?? a.item.created_at),
      ),
    );
  const globalQuoteIds = new Set(quoteInstallations.map((row: any) => row.quote_id));
  const globalQuotes = allQuotes.filter((quote: any) => globalQuoteIds.has(quote.id));
  const globalQuoteTicketIds = new Set(
    quoteTickets
      .filter((row: any) => globalQuoteIds.has(row.quote_id))
      .map((row: any) => row.ticket_id),
  );
  const relatedTickets = tickets.filter(
    (ticket: any) =>
      !globalQuoteTicketIds.has(ticket.id) || ticket.installation_id === installationId,
  );
  const presentParts = installationParts
    .filter((item: any) => item.installation_id === installationId)
    .map((item: any) => ({ ...item, part: parts.find((part: any) => part.id === item.part_id) }))
    .filter((item: any) => item.part);

  return (
    <div>
      {site ? (
        <Link
          to="/sites/$siteId"
          params={{ siteId: site.id }}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> {site.name}
        </Link>
      ) : null}
      <PageHeader
        title={
          installation.installation_number
            ? `${installation.installation_number} · ${installation.name}`
            : installation.name
        }
        description={[
          client?.client_number ? `${client.client_number} · ${client.name}` : client?.name,
          site?.site_number ? `${site.site_number} · ${site.name}` : site?.name,
          type?.name,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Informations de l'installation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Client :</span>{" "}
            {client
              ? client.client_number
                ? `${client.client_number} · ${client.name}`
                : client.name
              : "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Site :</span>{" "}
            {site ? (site.site_number ? `${site.site_number} · ${site.name}` : site.name) : "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Type :</span> {type?.name ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Marque / modèle :</span>{" "}
            {[brand?.name, model?.name].filter(Boolean).join(" · ") || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">N° de série :</span>{" "}
            {installation.serial_number || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Année :</span> {installation.year || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Localisation :</span>{" "}
            {installation.location || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Contrat :</span> {contract?.name || "—"}
          </div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Notes :</span> {installation.notes || "—"}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Tickets et devis globaux liés</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {relatedTickets.length === 0 && globalQuotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun ticket ou devis global lié à cette installation.
            </p>
          ) : null}
          {relatedTickets.map((ticket: any) => (
            <div key={ticket.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <b>{ticket.ticket_number}</b> · {ticket.title}
                </span>
                <Badge>{ticket.status}</Badge>
              </div>
            </div>
          ))}
          {globalQuotes.map((quote: any) => {
            const ticketNumbers = quoteTickets
              .filter((row: any) => row.quote_id === quote.id)
              .map(
                (row: any) =>
                  tickets.find((ticket: any) => ticket.id === row.ticket_id)?.ticket_number,
              )
              .filter(Boolean);
            return (
              <Link key={quote.id} to="/quotes/$quoteId" params={{ quoteId: quote.id }}>
                <Card className="p-3 text-sm transition-colors hover:bg-accent/50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <b>{quote.quote_number}</b> · devis global
                    </span>
                    <Badge variant="secondary">{quote.status ?? "brouillon"}</Badge>
                  </div>
                  {ticketNumbers.length > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Tickets : {ticketNumbers.join(", ")}
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Pièces présentes</CardTitle>
        </CardHeader>
        <CardContent>
          {presentParts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune pièce présente renseignée.</p>
          ) : (
            <div className="grid gap-2">
              {presentParts.map((item: any) => (
                <div key={item.part_id} className="rounded-md border border-border/60 p-3 text-sm">
                  <div className="font-medium">{item.part.name}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">
                      {item.component_type || item.part.category || "Type non défini"}
                    </Badge>
                    {(item.reference_override || item.part.reference) && (
                      <span>Réf. {item.reference_override || item.part.reference}</span>
                    )}
                    {item.part.pricing_unit === "linear_meter" && item.length_meters && (
                      <span>Taille {Number(item.length_meters)} ml</span>
                    )}
                    {item.dimensions && <span>Dimensions {item.dimensions}</span>}
                    {item.color && <span>Couleur {item.color}</span>}
                    {item.notes && <span>Options {item.notes}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <History className="h-4 w-4" />
        Historique
      </h2>
      <div className="grid gap-3">
        {interventions.map((intervention: any) => (
          <Card key={intervention.id} className="p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">
                <ClipboardList className="mr-2 inline h-4 w-4 text-primary" />
                {intervention.title}
              </div>
              <Badge variant="outline">{formatDate(intervention.date)}</Badge>
            </div>
            {intervention.description && (
              <p className="mt-1 text-xs text-muted-foreground">{intervention.description}</p>
            )}
          </Card>
        ))}
        {replacedParts.map(({ item, quote, part }: any) => (
          <Card key={item.id} className="p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">
                <Package className="mr-2 inline h-4 w-4 text-primary" />
                {part?.name ?? item.description}
              </div>
              <Badge variant="secondary">{formatDate(quote?.issued_at ?? item.created_at)}</Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Pièce remplacée · Quantité {item.quantity} · Devis{" "}
              {quote?.number ?? quote?.title ?? "—"}
            </div>
          </Card>
        ))}
        {interventions.length === 0 && replacedParts.length === 0 ? (
          <EmptyState
            title="Aucun historique"
            description="Les interventions et pièces remplacées apparaîtront ici."
          />
        ) : null}
      </div>
    </div>
  );
}
