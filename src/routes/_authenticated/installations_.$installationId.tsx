/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useList, useOne } from "@/lib/db-hooks";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ClipboardList, History, Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/installations_/$installationId")({
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
  const presentParts = installationParts
    .filter((item: any) => item.installation_id === installationId)
    .map((item: any) => parts.find((part: any) => part.id === item.part_id))
    .filter(Boolean);

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
        title={installation.name}
        description={[client?.name, site?.name, type?.name].filter(Boolean).join(" · ")}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Informations de l'installation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Client :</span> {client?.name ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Site :</span> {site?.name ?? "—"}
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
          <CardTitle className="text-base">Pièces présentes</CardTitle>
        </CardHeader>
        <CardContent>
          {presentParts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune pièce présente renseignée.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {presentParts.map((part: any) => (
                <Badge key={part.id} variant="secondary">
                  {part.name}
                </Badge>
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
