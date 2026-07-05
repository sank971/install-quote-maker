import { createFileRoute, Link } from "@tanstack/react-router";
import { useList } from "@/lib/db-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Users, MapPin, Wrench, FileText, Package, Truck, TrendingUp, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Stat({ icon: Icon, label, value, hint }: any) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const clients = useList("clients");
  const sites = useList("sites");
  const installations = useList("installations");
  const parts = useList("parts");
  const suppliers = useList("suppliers");
  const quotes = useList<any>("quotes");
  const items = useList<any>("quote_items");
  const supplierParts = useList<any>("supplier_parts");

  const potentialRevenue = (quotes.data ?? []).reduce((acc, q) => {
    const qItems = (items.data ?? []).filter((it: any) => it.quote_id === q.id);
    const parts = qItems.reduce(
      (s: number, it: any) => s + Number(it.unit_price) * Number(it.quantity),
      0,
    );
    const labor =
      Number(q.labor_hours ?? 0) * Number(q.travel_count ?? 1) * Number(q.labor_rate ?? 0);
    const travel = Number(q.travel_fee ?? 0);
    return acc + parts + labor + travel;
  }, 0);

  const totalMargin = (items.data ?? []).reduce((s: number, it: any) => {
    return s + (Number(it.unit_price) - Number(it.unit_cost)) * Number(it.quantity);
  }, 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de votre activité"
        actions={
          <Button asChild>
            <Link to="/quotes/new">Nouveau devis</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Clients" value={clients.data?.length ?? 0} />
        <Stat icon={MapPin} label="Sites" value={sites.data?.length ?? 0} />
        <Stat icon={Wrench} label="Installations" value={installations.data?.length ?? 0} />
        <Stat icon={FileText} label="Devis" value={quotes.data?.length ?? 0} />
        <Stat icon={Package} label="Pièces" value={parts.data?.length ?? 0} />
        <Stat icon={Truck} label="Fournisseurs" value={suppliers.data?.length ?? 0} />
        <Stat
          icon={TrendingUp}
          label="CA potentiel"
          value={fmt(potentialRevenue)}
          hint="Sur devis en cours"
        />
        <Stat
          icon={Percent}
          label="Marge totale"
          value={fmt(totalMargin)}
          hint="Sur pièces facturées"
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Devis récents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(quotes.data ?? []).slice(0, 5).map((q: any) => (
              <Link
                key={q.id}
                to="/quotes/$quoteId"
                params={{ quoteId: q.id }}
                className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 hover:bg-accent"
              >
                <div>
                  <div className="text-sm font-medium">{q.quote_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(q.issued_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs uppercase tracking-wider">
                  {q.status}
                </span>
              </Link>
            ))}
            {(quotes.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun devis pour l'instant.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fournisseurs les plus compétitifs</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const bySupplier = new Map<string, number>();
              (supplierParts.data ?? []).forEach((sp: any) => {
                bySupplier.set(sp.supplier_id, (bySupplier.get(sp.supplier_id) ?? 0) + 1);
              });
              const rows = [...bySupplier.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([sid, count]) => {
                  const s = suppliers.data?.find((x: any) => x.id === sid);
                  return { name: s?.name ?? "—", count };
                });
              if (rows.length === 0)
                return (
                  <p className="text-sm text-muted-foreground">Aucun fournisseur référencé.</p>
                );
              return (
                <div className="space-y-2">
                  {rows.map((r) => (
                    <div
                      key={r.name}
                      className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2"
                    >
                      <span className="text-sm font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{r.count} pièces</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
