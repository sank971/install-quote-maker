/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, History, PackageCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
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
import { useList, useOne } from "@/lib/db-hooks";
import { currentUserId } from "@/lib/ticket-workflow";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/storage-locations/$locationId")({
  component: StorageLocationTicketsPage,
});

const openStatuses = ["brouillon", "en_attente", "en_preparation", "en_transit", "livre"];
const statusLabels: Record<string, string> = {
  brouillon: "Brouillon",
  en_attente: "En attente",
  en_preparation: "En préparation",
  en_transit: "En transit",
  livre: "Livré / à valider",
  termine: "Terminé",
  annule: "Annulé",
};

function StorageLocationTicketsPage() {
  const { locationId } = Route.useParams();
  const qc = useQueryClient();
  const { data: location } = useOne<any>("storage_locations", locationId);
  const { data: tickets = [] } = useList<any>("stock_tickets", {
    filter: (q) =>
      q.or(`source_location_id.eq.${locationId},destination_location_id.eq.${locationId}`),
    orderBy: "created_at",
    key: ["stock_tickets", "location", locationId],
  });
  const { data: locations = [] } = useList<any>("storage_locations", { orderBy: "name" });
  const { data: parts = [] } = useList<any>("parts", { orderBy: "name", ascending: true });
  const { data: suppliers = [] } = useList<any>("suppliers", { orderBy: "name", ascending: true });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["stock_tickets", "location", locationId] });
    qc.invalidateQueries({ queryKey: ["storage_location_stocks"] });
  };

  const updateStatus = async (ticket: any, status: string) => {
    try {
      if (status === "termine") {
        const actor = await currentUserId();
        const { error } = await (supabase.rpc as any)("complete_stock_ticket", {
          p_ticket_id: ticket.id,
          p_actor: actor,
        });
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("stock_tickets" as any) as any)
          .update({ status })
          .eq("id", ticket.id);
        if (error) throw error;
      }
      invalidate();
      toast.success("Ticket stock mis à jour");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const renderTickets = (rows: any[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ticket</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Pièce</TableHead>
          <TableHead>Flux</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-muted-foreground">
              Aucun ticket.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((ticket) => {
            const part = parts.find((p: any) => p.id === ticket.part_id);
            const source = locations.find((l: any) => l.id === ticket.source_location_id);
            const destination = locations.find((l: any) => l.id === ticket.destination_location_id);
            const supplier = suppliers.find((s: any) => s.id === ticket.supplier_id);
            return (
              <TableRow key={ticket.id}>
                <TableCell className="font-medium">{ticket.ticket_number}</TableCell>
                <TableCell>
                  {ticket.type === "transfert_interne" ? "Échange interne" : "Commande fournisseur"}
                </TableCell>
                <TableCell>
                  {part?.name ?? "Pièce"} × {ticket.quantity}
                </TableCell>
                <TableCell>
                  {ticket.type === "transfert_interne"
                    ? `${source?.name ?? "Source"} → ${destination?.name ?? "Destination"}`
                    : `${supplier?.name ?? "Fournisseur"} → ${destination?.name ?? "Destination"}`}
                </TableCell>
                <TableCell>
                  <Badge variant={openStatuses.includes(ticket.status) ? "secondary" : "outline"}>
                    {statusLabels[ticket.status] ?? ticket.status}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  {openStatuses.includes(ticket.status) && ticket.status !== "livre" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(ticket, "en_transit")}
                    >
                      En transit
                    </Button>
                  )}
                  {openStatuses.includes(ticket.status) && (
                    <Button size="sm" onClick={() => updateStatus(ticket, "termine")}>
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Compléter
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  const currentTickets = tickets.filter((ticket: any) => openStatuses.includes(ticket.status));
  const historyTickets = tickets.filter((ticket: any) => !openStatuses.includes(ticket.status));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Tickets stock · ${location?.name ?? "Lieu"}`}
        description="Suivi des échanges de stock internes et commandes fournisseur liés à ce lieu."
        actions={
          <Button variant="outline" asChild>
            <Link to="/storage-locations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux lieux
            </Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <PackageCheck className="mr-2 inline h-4 w-4" />
            Tickets en cours
          </CardTitle>
        </CardHeader>
        <CardContent>{renderTickets(currentTickets)}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <History className="mr-2 inline h-4 w-4" />
            Historique des tickets
          </CardTitle>
        </CardHeader>
        <CardContent>{renderTickets(historyTickets)}</CardContent>
      </Card>
    </div>
  );
}
