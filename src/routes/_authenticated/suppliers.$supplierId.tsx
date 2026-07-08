/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Package, ShoppingCart, TrendingUp, WalletCards } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, EmptyState } from "@/components/page-header";
import { useList } from "@/lib/db-hooks";

export const Route = createFileRoute("/_authenticated/suppliers/$supplierId")({
  component: SupplierStatsPage,
});

const money = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value || 0);

const percent = (value: number | null | undefined) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "—";
  return `${numericValue > 0 ? "+" : ""}${numericValue.toFixed(1)}%`;
};

const totalOfferCost = (offer?: any | null) =>
  offer ? Number(offer.purchase_price || 0) + Number(offer.shipping_cost || 0) : 0;

const cheapestOffer = (offers: any[]) =>
  offers.reduce<any | null>(
    (best, row) => (!best || totalOfferCost(row) < totalOfferCost(best) ? row : best),
    null,
  );

function SupplierStatsPage() {
  const { supplierId } = Route.useParams();
  const { data: suppliers = [] } = useList<any>("suppliers", { orderBy: "name", ascending: true });
  const { data: parts = [] } = useList<any>("parts", { orderBy: "name", ascending: true });
  const { data: supplierParts = [] } = useList<any>("supplier_parts");
  const { data: orders = [] } = useList<any>("part_orders");
  const { data: orderItems = [] } = useList<any>("part_order_items");
  const { data: quoteItems = [] } = useList<any>("quote_items");

  const supplier = suppliers.find((row: any) => row.id === supplierId);

  const stats = useMemo(() => {
    const supplierOffers = supplierParts.filter((row: any) => row.supplier_id === supplierId);
    const offerByPart = new Map(supplierOffers.map((offer: any) => [offer.part_id, offer]));
    const supplierPartIds = new Set(supplierOffers.map((offer: any) => offer.part_id));
    const comparableOffers = supplierOffers
      .map((offer: any) => {
        const offersForPart = supplierParts.filter((row: any) => row.part_id === offer.part_id);
        const otherOffers = offersForPart.filter((row: any) => row.supplier_id !== supplierId);
        const cost = totalOfferCost(offer);
        const otherAverage =
          otherOffers.reduce((sum: number, row: any) => sum + totalOfferCost(row), 0) /
          (otherOffers.length || 1);
        const cheapest = cheapestOffer(offersForPart);
        const cheapestCost = totalOfferCost(cheapest);
        return {
          part: parts.find((part: any) => part.id === offer.part_id),
          offer,
          otherOffers,
          cost,
          otherAverage,
          averageDifferencePct:
            otherOffers.length && otherAverage > 0
              ? ((cost - otherAverage) / otherAverage) * 100
              : 0,
          cheapest,
          cheapestSupplier: suppliers.find((row: any) => row.id === cheapest?.supplier_id),
          cheapestDifferencePct:
            cheapestCost > 0 ? ((cost - cheapestCost) / cheapestCost) * 100 : 0,
        };
      })
      .filter((row: any) => row.otherOffers.length > 0)
      .sort((a: any, b: any) => a.averageDifferencePct - b.averageDifferencePct);

    const completedOrders = orders.filter(
      (order: any) => order.supplier_id === supplierId && !["annulee"].includes(order.status),
    );
    const completedOrderIds = new Set(completedOrders.map((order: any) => order.id));
    const supplierOrderItems = orderItems.filter((item: any) =>
      completedOrderIds.has(item.part_order_id),
    );
    const quoteItemsByPart = new Map<string, any[]>();
    quoteItems.forEach((item: any) => {
      if (!item.part_id) return;
      quoteItemsByPart.set(item.part_id, [...(quoteItemsByPart.get(item.part_id) ?? []), item]);
    });

    let ordersAmount = 0;
    let salesProfit = 0;
    supplierOrderItems.forEach((item: any) => {
      const quantity = Number(item.quantity || 1);
      const offer = item.part_id ? offerByPart.get(item.part_id) : null;
      const part = parts.find((row: any) => row.id === item.part_id);
      const cost = totalOfferCost(offer) * quantity;
      const relatedQuoteItems = item.part_id ? (quoteItemsByPart.get(item.part_id) ?? []) : [];
      const averageSale =
        relatedQuoteItems.reduce((sum: number, row: any) => sum + Number(row.unit_price || 0), 0) /
        (relatedQuoteItems.length || 1);
      const sale = (averageSale || Number(part?.sale_price || 0)) * quantity;
      ordersAmount += cost;
      salesProfit += sale - cost;
    });

    const allPartIdsSoldByOthers = new Set(
      supplierParts
        .filter((row: any) => row.supplier_id !== supplierId)
        .map((row: any) => row.part_id),
    );
    const partsSoldByOthers = [...allPartIdsSoldByOthers]
      .map((partId) => {
        const offersForPart = supplierParts.filter((row: any) => row.part_id === partId);
        const cheapest = cheapestOffer(offersForPart);
        const ownOffer = offerByPart.get(partId);
        const cheapestCost = totalOfferCost(cheapest);
        return {
          part: parts.find((part: any) => part.id === partId),
          ownOffer,
          cheapest,
          cheapestSupplier: suppliers.find((row: any) => row.id === cheapest?.supplier_id),
          cheapestCost,
          differencePct:
            ownOffer && cheapestCost > 0
              ? ((totalOfferCost(ownOffer) - cheapestCost) / cheapestCost) * 100
              : null,
        };
      })
      .sort((a: any, b: any) => (a.differencePct ?? 9999) - (b.differencePct ?? 9999));

    const averageDifferencePct =
      comparableOffers.reduce((sum: number, row: any) => sum + row.averageDifferencePct, 0) /
      (comparableOffers.length || 1);

    return {
      supplierOffers,
      comparableOffers,
      averageDifferencePct,
      completedOrders,
      ordersAmount,
      salesProfit,
      partsSoldByOthers,
    };
  }, [orders, orderItems, parts, quoteItems, supplierId, supplierParts, suppliers]);

  if (!supplier) {
    return (
      <EmptyState
        title="Fournisseur introuvable"
        description="Le fournisseur demandé n’existe pas ou n’est pas accessible."
        action={
          <Button asChild>
            <Link to="/suppliers">Retour aux fournisseurs</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Statistiques — ${supplier.name}`}
        description="Performance d’achat, commandes et comparaison prix avec les autres fournisseurs."
        actions={
          <Button asChild variant="outline">
            <Link to="/suppliers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Kpi
          icon={Package}
          label="Pièces référencées"
          value={String(stats.supplierOffers.length)}
        />
        <Kpi
          icon={ShoppingCart}
          label="Commandes effectuées"
          value={String(stats.completedOrders.length)}
        />
        <Kpi icon={WalletCards} label="Montant commandes" value={money(stats.ordersAmount)} />
        <Kpi icon={TrendingUp} label="Bénéfice ventes estimé" value={money(stats.salesProfit)} />
        <Kpi
          icon={TrendingUp}
          label="Écart moyen vs autres"
          value={percent(stats.averageDifferencePct)}
          muted="Sur pièces communes"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pièces référencées et comparaison moyenne</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pièce</TableHead>
                <TableHead>Prix fournisseur</TableHead>
                <TableHead>Écart vs moyenne autres</TableHead>
                <TableHead>Moins cher</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.comparableOffers.map((row: any) => (
                <TableRow key={row.offer.id}>
                  <TableCell className="font-medium">
                    {row.part?.name ?? "Pièce inconnue"}
                  </TableCell>
                  <TableCell>{money(row.cost)}</TableCell>
                  <TableCell>
                    <Badge variant={row.averageDifferencePct <= 0 ? "default" : "secondary"}>
                      {percent(row.averageDifferencePct)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.cheapestSupplier?.name ?? "—"} · {money(totalOfferCost(row.cheapest))} (
                    {percent(row.cheapestDifferencePct)})
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pièces vendues par d’autres fournisseurs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pièce</TableHead>
                <TableHead>Moins cher</TableHead>
                <TableHead>Prix le moins cher</TableHead>
                <TableHead>Écart de ce fournisseur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.partsSoldByOthers.map((row: any) => (
                <TableRow key={row.part?.id ?? row.cheapest?.id}>
                  <TableCell className="font-medium">
                    {row.part?.name ?? "Pièce inconnue"}
                  </TableCell>
                  <TableCell>{row.cheapestSupplier?.name ?? "—"}</TableCell>
                  <TableCell>{money(row.cheapestCost)}</TableCell>
                  <TableCell>
                    {row.ownOffer ? (
                      <Badge variant={row.differencePct <= 0 ? "default" : "secondary"}>
                        {percent(row.differencePct)}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Non référencée</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, muted }: any) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
          {muted && <div className="text-xs text-muted-foreground">{muted}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
