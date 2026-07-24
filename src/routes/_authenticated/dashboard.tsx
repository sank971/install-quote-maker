/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useList } from "@/lib/db-hooks";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { FiltersBar } from "@/components/dashboard/filters-bar";
import { RankingList } from "@/components/dashboard/ranking-list";
import {
  DEFAULT_COST_SETTINGS,
  aggregateByClient,
  aggregateByContract,
  aggregateBySite,
  applyFilters,
  buildAlerts,
  buildTimeSeries,
  computeGlobalKpis,
  computeTechnicians,
  fleetBreakdown,
  topParts,
  topSuppliers,
  type CostSettings,
  type Datasets,
  type Filters,
  type TimeBucket,
} from "@/lib/analytics";
import {
  TimeSeriesChart,
  EntityBarChart,
  MarginBarChart,
  CostBreakdownChart,
} from "@/components/dashboard/charts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Coins,
  FileCheck,
  FileText,
  Package,
  Percent,
  Settings2,
  TrendingUp,
  TrendingDown,
  Truck,
  Users,
  Wrench,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const fmtEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n || 0);
const fmtPct = (n: number) => `${(n || 0).toFixed(1)} %`;

function Dashboard() {
  const [filters, setFilters] = useState<Filters>({ period: "month" });
  const [bucket, setBucket] = useState<TimeBucket>("month");

  const clients = useList<any>("clients");
  const sites = useList<any>("sites");
  const contracts = useList<any>("contracts");
  const installations = useList<any>("installations");
  const installationTypes = useList<any>("installation_types");
  const brands = useList<any>("brands");
  const models = useList<any>("models");
  const parts = useList<any>("parts");
  const suppliers = useList<any>("suppliers");
  const supplierParts = useList<any>("supplier_parts");
  const quotes = useList<any>("quotes");
  const quoteItems = useList<any>("quote_items");
  const interventions = useList<any>("interventions");
  const interventionReports = useList<any>("intervention_reports");
  const partOrders = useList<any>("part_orders");
  const partOrderItems = useList<any>("part_order_items");
  const costSettingsQuery = useList<any>("cost_settings");

  const settings: CostSettings = useMemo(() => {
    const row = (costSettingsQuery.data ?? [])[0];
    if (!row) return DEFAULT_COST_SETTINGS;
    return {
      ...DEFAULT_COST_SETTINGS,
      ...Object.fromEntries(
        Object.entries(row).filter(([, v]) => v !== null && v !== undefined),
      ),
    } as CostSettings;
  }, [costSettingsQuery.data]);

  const rawData: Datasets = {
    quotes: quotes.data ?? [],
    quoteItems: quoteItems.data ?? [],
    interventions: interventions.data ?? [],
    partOrders: partOrders.data ?? [],
    partOrderItems: partOrderItems.data ?? [],
    clients: clients.data ?? [],
    sites: sites.data ?? [],
    contracts: contracts.data ?? [],
    installations: installations.data ?? [],
    parts: parts.data ?? [],
    suppliers: suppliers.data ?? [],
    brands: brands.data ?? [],
    installationTypes: installationTypes.data ?? [],
    models: models.data ?? [],
    supplierParts: supplierParts.data ?? [],
    interventionReports: interventionReports.data ?? [],
  };

  const data = useMemo(() => applyFilters(rawData, filters), [rawData, filters]);
  const kpis = useMemo(() => computeGlobalKpis(data, settings), [data, settings]);
  const clientRows = useMemo(() => aggregateByClient(data, settings), [data, settings]);
  const contractRows = useMemo(() => aggregateByContract(data, settings), [data, settings]);
  const siteRows = useMemo(() => aggregateBySite(data, settings), [data, settings]);
  const partsRanking = useMemo(() => topParts(data), [data]);
  const suppliersRanking = useMemo(() => topSuppliers(data), [data]);
  const fleet = useMemo(() => fleetBreakdown(data), [data]);
  const technicians = useMemo(() => computeTechnicians(data, settings), [data, settings]);
  const alerts = useMemo(
    () => buildAlerts(clientRows, contractRows, siteRows, partsRanking, suppliersRanking, settings),
    [clientRows, contractRows, siteRows, partsRanking, suppliersRanking, settings],
  );
  const timeSeries = useMemo(() => buildTimeSeries(data, settings, bucket), [data, settings, bucket]);
  const clientChart = useMemo(
    () =>
      clientRows
        .filter((r) => r.revenue > 0 || r.cost > 0)
        .slice(0, 10)
        .map((r) => ({ label: r.label, revenue: r.revenue, cost: r.cost, margin: r.netMargin })),
    [clientRows],
  );
  const contractChart = useMemo(
    () =>
      contractRows
        .slice(0, 10)
        .map((r) => ({ label: r.label, margin: r.netMargin })),
    [contractRows],
  );
  const costBreakdown = useMemo(
    () => [
      { label: "Achats pièces", value: kpis.purchasesCost },
      { label: "Déplacements", value: kpis.travelCost },
      { label: "Main-d'œuvre", value: kpis.laborCost },
      { label: "Envois", value: kpis.shippingCost },
    ],
    [kpis],
  );


  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description="Pilotage financier, rentabilité et opérations"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/cost-settings">
                <Settings2 className="mr-2 h-4 w-4" /> Coûts
              </Link>
            </Button>
            <Button asChild>
              <Link to="/quotes/new">Nouveau devis</Link>
            </Button>
          </div>
        }
      />

      <FiltersBar
        filters={filters}
        onChange={setFilters}
        clients={rawData.clients}
        sites={rawData.sites}
        contracts={rawData.contracts}
        installationTypes={rawData.installationTypes}
        brands={rawData.brands}
        suppliers={rawData.suppliers}
      />

      {alerts.length > 0 && (
        <Alert className="mb-6 border-amber-300 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">
              {alerts.length} alerte{alerts.length > 1 ? "s" : ""}
            </span>{" "}
            — consultez l'onglet Alertes.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 flex flex-wrap">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="contracts">Contrats</TabsTrigger>
          <TabsTrigger value="parts">Pièces</TabsTrigger>
          <TabsTrigger value="suppliers">Fournisseurs</TabsTrigger>
          <TabsTrigger value="fleet">Parc</TabsTrigger>
          <TabsTrigger value="techs">Techniciens</TabsTrigger>
          <TabsTrigger value="alerts">Alertes ({alerts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={Coins}
              label="CA total"
              value={fmtEur(kpis.revenue)}
              hint="Devis acceptés"
            />
            <KpiCard
              icon={TrendingUp}
              label="Marge brute"
              value={fmtEur(kpis.grossMargin)}
              tone={kpis.grossMargin >= 0 ? "positive" : "negative"}
            />
            <KpiCard
              icon={TrendingUp}
              label="Marge nette estimée"
              value={fmtEur(kpis.netMargin)}
              tone={kpis.netMargin >= 0 ? "positive" : "negative"}
              hint="CA − coûts réels"
            />
            <KpiCard
              icon={Percent}
              label="Taux de marge"
              value={fmtPct(kpis.marginPct)}
              tone={kpis.marginPct >= settings.minimum_margin_pct ? "positive" : "warning"}
            />
            <KpiCard icon={Wrench} label="Interventions" value={kpis.interventionCount} />
            <KpiCard icon={FileText} label="Devis créés" value={kpis.quoteCount} />
            <KpiCard
              icon={FileCheck}
              label="Taux acceptation"
              value={fmtPct(kpis.acceptanceRate)}
              hint={fmtEur(kpis.acceptedAmount) + " acceptés"}
            />
            <KpiCard icon={Truck} label="Achats pièces" value={fmtEur(kpis.partOrdersAmount)} />
            <KpiCard
              icon={TrendingDown}
              label="Coût déplacements"
              value={fmtEur(kpis.travelCost)}
              tone="warning"
            />
            <KpiCard
              icon={TrendingDown}
              label="Coût techniciens"
              value={fmtEur(kpis.laborCost)}
              tone="warning"
            />
            <KpiCard
              icon={TrendingDown}
              label="Coût envois pièces"
              value={fmtEur(kpis.shippingCost)}
              tone="warning"
            />
            <KpiCard icon={Building2} label="Contrats actifs" value={kpis.activeContracts} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <RankingList
              title="Top clients rentables"
              items={clientRows
                .filter((r) => r.revenue > 0)
                .slice(0, 10)
                .map((r) => ({
                  label: r.label,
                  value: fmtEur(r.netMargin),
                  meta: fmtPct(r.marginPct),
                  status: r.status,
                }))}
            />
            <RankingList
              title="Clients les moins rentables"
              items={[...clientRows]
                .filter((r) => r.cost > 0)
                .sort((a, b) => a.netMargin - b.netMargin)
                .slice(0, 10)
                .map((r) => ({
                  label: r.label,
                  value: fmtEur(r.netMargin),
                  meta: fmtPct(r.marginPct),
                  status: r.status,
                }))}
            />
          </div>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rentabilité par client</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ProfitTable rows={clientRows} label="Client" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rentabilité par contrat</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ProfitTable rows={contractRows} label="Contrat" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parts" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={Package}
              label="Total pièces en base"
              value={rawData.parts.length}
              hint="Références enregistrées"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pièces — commandes & marges</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">Pièce</th>
                    <th className="p-3 text-right">Qté</th>
                    <th className="p-3 text-right">Commandes</th>
                    <th className="p-3 text-right">CA</th>
                    <th className="p-3 text-right">Coût</th>
                    <th className="p-3 text-right">Marge</th>
                    <th className="p-3 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {partsRanking.slice(0, 50).map((p, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="font-medium">{p.label}</div>
                        {p.ref && <div className="text-xs text-muted-foreground">{p.ref}</div>}
                      </td>
                      <td className="p-3 text-right">{p.qty}</td>
                      <td className="p-3 text-right">{p.orders}</td>
                      <td className="p-3 text-right">{fmtEur(p.revenue)}</td>
                      <td className="p-3 text-right">{fmtEur(p.cost)}</td>
                      <td
                        className={`p-3 text-right font-medium ${p.margin >= 0 ? "text-emerald-700" : "text-red-700"}`}
                      >
                        {fmtEur(p.margin)}
                      </td>
                      <td className="p-3 text-right">{fmtPct(p.marginPct)}</td>
                    </tr>
                  ))}
                  {partsRanking.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">
                        Aucune pièce commandée ou vendue sur la période.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fournisseurs — volume d'achat</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">Fournisseur</th>
                    <th className="p-3 text-right">Commandes</th>
                    <th className="p-3 text-right">Pièces distinctes</th>
                    <th className="p-3 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliersRanking.map((s) => (
                    <tr key={s.key} className="border-b last:border-0">
                      <td className="p-3 font-medium">{s.label}</td>
                      <td className="p-3 text-right">{s.orders}</td>
                      <td className="p-3 text-right">{s.distinctPartCount}</td>
                      <td className="p-3 text-right">{fmtEur(s.volume)}</td>
                    </tr>
                  ))}
                  {suppliersRanking.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                        Aucun achat fournisseur sur la période.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <RankingList
              title="Par type d'installation"
              items={fleet.byType.map((r) => ({ label: r.label, value: String(r.count) }))}
            />
            <RankingList
              title="Par marque"
              items={fleet.byBrand.map((r) => ({ label: r.label, value: String(r.count) }))}
            />
            <RankingList
              title="Par site"
              items={fleet.bySite.map((r) => ({ label: r.label, value: String(r.count) }))}
            />
          </div>
          <RankingList
            title="Sites générant le plus d'interventions"
            items={siteRows.slice(0, 10).map((r) => ({
              label: r.label,
              sublabel: r.sublabel,
              value: `${r.interventionCount} interv.`,
              meta: fmtEur(r.netMargin),
              status: r.status,
            }))}
          />
        </TabsContent>

        <TabsContent value="techs">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Techniciens</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">Technicien</th>
                    <th className="p-3 text-right">Interventions</th>
                    <th className="p-3 text-right">Km</th>
                    <th className="p-3 text-right">Coût trajets</th>
                    <th className="p-3 text-right">Coût total</th>
                  </tr>
                </thead>
                <tbody>
                  {technicians.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="p-3 font-mono text-xs">{t.id.slice(0, 8)}…</td>
                      <td className="p-3 text-right">{t.interventions}</td>
                      <td className="p-3 text-right">{t.km.toFixed(0)}</td>
                      <td className="p-3 text-right">{fmtEur(t.travelCost)}</td>
                      <td className="p-3 text-right">{fmtEur(t.totalCost)}</td>
                    </tr>
                  ))}
                  {technicians.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                        Aucune intervention n'a de technicien affecté. Renseignez le champ sur les
                        interventions pour voir les coûts par technicien.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alertes & recommandations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune alerte détectée sur la période. 🎉
                </p>
              ) : (
                alerts.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-md border border-border/60 px-3 py-2"
                  >
                    <Badge
                      variant="outline"
                      className={
                        a.level === "red"
                          ? "bg-red-500/15 text-red-700 border-red-500/30"
                          : "bg-amber-500/15 text-amber-700 border-amber-500/30"
                      }
                    >
                      {a.level === "red" ? "Critique" : "Attention"}
                    </Badge>
                    <span className="text-sm">{a.message}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfitTable({ rows, label }: { rows: any[]; label: string }) {
  if (rows.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">Aucune donnée sur la période.</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">{label}</th>
            <th className="p-3 text-right">CA</th>
            <th className="p-3 text-right">Coût</th>
            <th className="p-3 text-right">Marge nette</th>
            <th className="p-3 text-right">%</th>
            <th className="p-3 text-right">Interv.</th>
            <th className="p-3 text-right">Devis</th>
            <th className="p-3">Statut</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 100).map((r) => (
            <tr key={r.key} className="border-b last:border-0">
              <td className="p-3">
                <div className="font-medium">{r.label}</div>
                {r.sublabel && <div className="text-xs text-muted-foreground">{r.sublabel}</div>}
              </td>
              <td className="p-3 text-right">{fmtEur(r.revenue)}</td>
              <td className="p-3 text-right">{fmtEur(r.cost)}</td>
              <td
                className={`p-3 text-right font-medium ${r.netMargin >= 0 ? "text-emerald-700" : "text-red-700"}`}
              >
                {fmtEur(r.netMargin)}
              </td>
              <td className="p-3 text-right">{fmtPct(r.marginPct)}</td>
              <td className="p-3 text-right">{r.interventionCount}</td>
              <td className="p-3 text-right">
                {r.quoteCount}
                {r.acceptedQuotes > 0 && ` (${r.acceptedQuotes}✓)`}
              </td>
              <td className="p-3">
                <Badge
                  variant="outline"
                  className={
                    r.status === "green"
                      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                      : r.status === "amber"
                        ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                        : "bg-red-500/15 text-red-700 border-red-500/30"
                  }
                >
                  {r.status === "green"
                    ? "Rentable"
                    : r.status === "amber"
                      ? "Limite"
                      : "Déficitaire"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Prevent unused imports warning
void BarChart3;
void Users;
