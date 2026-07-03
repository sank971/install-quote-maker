/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useList, useOne } from "@/lib/db-hooks";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, History, MapPin, Package, Wrench } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sites_/$siteId")({
  component: SiteDetail,
});

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}

function SiteDetail() {
  const { siteId } = Route.useParams();
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
        title={site.name}
        description={[client?.name, site.address].filter(Boolean).join(" · ")}
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
                      <div className="font-medium">{installation.name}</div>
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
