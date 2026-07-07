/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PackageCheck, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useList } from "@/lib/db-hooks";
import {
  addHistoryEvent,
  currentUserId,
  partOrderStatuses,
  setTicketStatus,
} from "@/lib/ticket-workflow";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/orders")({
  component: OrdersPage,
});

const orderStatusLabels: Record<string, string> = {
  a_commander: "À commander",
  commandee: "Commandée",
  en_attente_reception: "En attente réception",
  partiellement_recue: "Partiellement reçue",
  recue: "Reçue",
  probleme_fournisseur: "Problème fournisseur",
  annulee: "Annulée",
};

const orderStatusColors: Record<string, string> = {
  a_commander: "bg-slate-100 text-slate-800",
  commandee: "bg-blue-100 text-blue-800",
  en_attente_reception: "bg-orange-100 text-orange-800",
  partiellement_recue: "bg-amber-100 text-amber-800",
  recue: "bg-green-100 text-green-800",
  probleme_fournisseur: "bg-red-100 text-red-800",
  annulee: "bg-gray-200 text-gray-800",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}

function OrdersPage() {
  const qc = useQueryClient();
  const { data: orders = [] } = useList<any>("part_orders");
  const { data: orderItems = [] } = useList<any>("part_order_items");
  const { data: tickets = [] } = useList<any>("tickets");
  const { data: sites = [] } = useList<any>("sites");
  const { data: installations = [] } = useList<any>("installations");
  const { data: suppliers = [] } = useList<any>("suppliers");
  const { data: interventions = [] } = useList<any>("interventions");
  const { data: quoteTickets = [] } = useList<any>("quote_tickets");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const invalidate = () =>
    ["part_orders", "interventions", "tickets", "history_events", "quote_tickets"].forEach(
      (table) => qc.invalidateQueries({ queryKey: [table] }),
    );

  const enrichedOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return orders
      .map((order: any) => {
        const ticket = tickets.find((t: any) => t.id === order.ticket_id);
        const site = sites.find((s: any) => s.id === ticket?.site_id || s.id === order.site_id);
        const installation = installations.find((i: any) => i.id === order.installation_id);
        const supplier = suppliers.find((s: any) => s.id === order.supplier_id);
        const items = orderItems.filter((item: any) => item.part_order_id === order.id);
        const hasRepair = interventions.some(
          (intervention: any) =>
            intervention.ticket_id === order.ticket_id &&
            intervention.type === "reparation" &&
            !["echec", "annulee"].includes(intervention.status),
        );
        return { order, ticket, site, installation, supplier, items, hasRepair };
      })
      .filter(({ order, ticket, site, installation, supplier, items }: any) => {
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active"
            ? !["recue", "annulee"].includes(order.status)
            : order.status === statusFilter);
        const haystack = [
          order.id,
          order.status,
          ticket?.ticket_number,
          ticket?.title,
          site?.name,
          installation?.name,
          supplier?.name,
          ...items.flatMap((item: any) => [item.designation, item.reference]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return matchesStatus && (!query || haystack.includes(query));
      });
  }, [
    installations,
    interventions,
    orderItems,
    orders,
    searchQuery,
    sites,
    statusFilter,
    suppliers,
    tickets,
  ]);

  const updateOrderStatus = async (orderData: any, status: string) => {
    const updates: Record<string, any> = { status };
    if (status === "recue") updates.received_at = new Date().toISOString().slice(0, 10);
    const { error } = await (supabase.from("part_orders" as any) as any)
      .update(updates)
      .eq("id", orderData.order.id);
    if (error) return toast.error(error.message);

    if (orderData.ticket) {
      const relatedQuoteOrders = orderData.order.quote_id
        ? orders.filter((order: any) => order.quote_id === orderData.order.quote_id)
        : orders.filter((order: any) => order.ticket_id === orderData.ticket.id);
      const updatedQuoteOrders = relatedQuoteOrders.map((order: any) =>
        order.id === orderData.order.id ? { ...order, status } : order,
      );
      const allReceived =
        updatedQuoteOrders.length > 0 &&
        updatedQuoteOrders.every((order: any) => ["recue", "annulee"].includes(order.status));
      const targetTickets = orderData.order.quote_id
        ? quoteTickets
            .filter((row: any) => row.quote_id === orderData.order.quote_id)
            .map((row: any) => tickets.find((ticket: any) => ticket.id === row.ticket_id))
            .filter(Boolean)
        : [orderData.ticket];

      if (status === "recue" && allReceived) {
        for (const targetTicket of targetTickets) {
          await setTicketStatus(
            targetTicket,
            "pieces_recues",
            "parts_received",
            "Toutes les pièces du devis sont reçues",
          );
        }
      } else if (
        ["commandee", "en_attente_reception", "partiellement_recue", "recue"].includes(status)
      ) {
        for (const targetTicket of targetTickets) {
          await setTicketStatus(
            targetTicket,
            "en_attente_pieces",
            "part_order_status_changed",
            allReceived
              ? `Commande de pièces : ${orderStatusLabels[status] ?? status}`
              : `Commande de pièces : ${orderStatusLabels[status] ?? status} (réception globale incomplète)`,
          );
        }
      } else {
        await addHistoryEvent(
          orderData.ticket.owner_id,
          {
            ticket_id: orderData.ticket.id,
            site_id: orderData.ticket.site_id,
            installation_id: orderData.ticket.installation_id,
          },
          "part_order_status_changed",
          `Commande de pièces : ${orderStatusLabels[status] ?? status}`,
        );
      }
    }

    invalidate();
    toast.success("Statut de commande mis à jour");
  };

  const createRepair = async (orderData: any) => {
    const ticket = orderData.ticket;
    if (!ticket) return toast.error("Ticket introuvable pour cette commande");
    const owner_id = await currentUserId();
    const { error } = await (supabase.from("interventions" as any) as any).insert({
      owner_id,
      ticket_id: ticket.id,
      site_id: ticket.site_id,
      installation_id: ticket.installation_id ?? orderData.order.installation_id,
      title: `Réparation ${ticket.ticket_number}`,
      type: "reparation",
      status: "non_assignee",
    });
    if (error) return toast.error(error.message);
    await setTicketStatus(
      ticket,
      "reparation_a_planifier",
      "repair_intervention_created",
      "Intervention de réparation créée après réception des pièces",
    );
    invalidate();
    toast.success("Intervention créée, vous pouvez continuer le process");
  };

  return (
    <>
      <PageHeader
        title="Commandes en cours"
        description="Suivi des pièces commandées depuis les devis et création des interventions après réception."
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Rechercher par ticket, site, fournisseur ou pièce..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Commandes actives</SelectItem>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {partOrderStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {orderStatusLabels[status] ?? status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {enrichedOrders.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Aucune commande à afficher"
          description="Les commandes de pièces créées depuis les tickets apparaîtront ici."
        />
      ) : (
        <div className="grid gap-4">
          {enrichedOrders.map((orderData: any) => (
            <Card key={orderData.order.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Commande #{orderData.order.id.slice(0, 8)}
                    </CardTitle>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Créée le {formatDate(orderData.order.created_at)} · Fournisseur :{" "}
                      {orderData.supplier?.name ?? "—"}
                    </div>
                  </div>
                  <Badge className={orderStatusColors[orderData.order.status] ?? ""}>
                    {orderStatusLabels[orderData.order.status] ?? orderData.order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm md:grid-cols-3">
                  <div>
                    <div className="text-muted-foreground">Ticket</div>
                    {orderData.ticket ? (
                      <Link
                        to="/ticket/$ticketSlug"
                        params={{ ticketSlug: orderData.ticket.ticket_number }}
                        className="font-medium text-primary hover:underline"
                      >
                        {orderData.ticket.ticket_number}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div>
                    <div className="text-muted-foreground">Site</div>
                    <div className="font-medium">{orderData.site?.name ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Installation</div>
                    <div className="font-medium">{orderData.installation?.name ?? "—"}</div>
                  </div>
                </div>

                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <div className="mb-2 font-medium">Pièces commandées</div>
                  {orderData.items.length > 0 ? (
                    <ul className="space-y-1">
                      {orderData.items.map((item: any) => (
                        <li key={item.id} className="flex justify-between gap-3">
                          <span>{item.designation ?? "Pièce"}</span>
                          <span className="text-muted-foreground">x{item.quantity ?? 1}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-muted-foreground">
                      Aucune ligne de commande renseignée.
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <Select
                    value={orderData.order.status}
                    onValueChange={(status) => updateOrderStatus(orderData, status)}
                  >
                    <SelectTrigger className="md:w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {partOrderStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {orderStatusLabels[status] ?? status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => createRepair(orderData)}
                    disabled={orderData.order.status !== "recue" || orderData.hasRepair}
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    {orderData.hasRepair ? "Intervention déjà créée" : "Créer l’intervention"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
