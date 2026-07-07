import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { Plus, Pencil, Trash2, Building2, Users, Wrench, Ticket, Euro } from "lucide-react";
import { useList, useRemove, useUpsert } from "@/lib/db-hooks";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/grand-accounts")({
  component: GrandAccountsPage,
});

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(
    value,
  );
}

function quoteTotals(quote: any, items: any[]) {
  const quoteItems = items.filter((item: any) => item.quote_id === quote.id);
  const partsHT = quoteItems.reduce(
    (sum: number, item: any) => sum + Number(item.unit_price ?? 0) * Number(item.quantity ?? 0),
    0,
  );
  const partsCost = quoteItems.reduce(
    (sum: number, item: any) => sum + Number(item.unit_cost ?? 0) * Number(item.quantity ?? 0),
    0,
  );
  const laborHT =
    Number(quote.labor_hours ?? 0) *
    Number(quote.travel_count ?? 1) *
    Number(quote.labor_rate ?? 0);
  const feesHT =
    Number(quote.travel_fee ?? 0) +
    Number(quote.shipping_fee ?? 0) +
    Number(quote.waste_treatment_fee ?? 0) +
    Number(quote.oversized_shipping_fee ?? 0) +
    Number(quote.dump_evacuation_fee ?? 0) +
    Number(quote.lifting_equipment_fee ?? 0);
  const totalHT = partsHT + laborHT + feesHT;
  return { totalHT, marginHT: totalHT - partsCost };
}

const revenueStatuses = new Set(["envoye", "accepte", "pieces_commandees"]);
const openTicketStatuses = new Set(["cloture", "termine"]);

function GrandAccountsPage() {
  const { data: grandAccounts = [] } = useList<any>("grand_accounts", {
    orderBy: "name",
    ascending: true,
  });
  const { data: clients = [] } = useList<any>("clients", { orderBy: "name", ascending: true });
  const { data: sites = [] } = useList<any>("sites");
  const { data: installations = [] } = useList<any>("installations");
  const { data: tickets = [] } = useList<any>("tickets");
  const { data: quotes = [] } = useList<any>("quotes");
  const { data: quoteItems = [] } = useList<any>("quote_items");
  const upsert = useUpsert("grand_accounts", [["grand_accounts"]]);
  const remove = useRemove("grand_accounts", [["grand_accounts"], ["clients"]]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const statsByClient = useMemo(() => {
    return clients.map((client: any) => {
      const clientSites = sites.filter((site: any) => site.client_id === client.id);
      const siteIds = new Set(clientSites.map((site: any) => site.id));
      const clientInstallations = installations.filter((installation: any) =>
        siteIds.has(installation.site_id),
      );
      const clientTickets = tickets.filter((ticket: any) => ticket.client_id === client.id);
      const clientQuotes = quotes.filter(
        (quote: any) => quote.client_id === client.id && revenueStatuses.has(quote.status),
      );
      const quoteStats = clientQuotes.reduce(
        (acc: { revenue: number; margin: number }, quote: any) => {
          const totals = quoteTotals(quote, quoteItems);
          return { revenue: acc.revenue + totals.totalHT, margin: acc.margin + totals.marginHT };
        },
        { revenue: 0, margin: 0 },
      );
      return {
        client,
        siteCount: clientSites.length,
        installationCount: clientInstallations.length,
        revenue: quoteStats.revenue,
        marginRate: quoteStats.revenue > 0 ? quoteStats.margin / quoteStats.revenue : 0,
        openTicketCount: clientTickets.filter(
          (ticket: any) => !openTicketStatuses.has(ticket.status),
        ).length,
        totalTicketCount: clientTickets.length,
      };
    });
  }, [clients, installations, quoteItems, quotes, sites, tickets]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await upsert.mutateAsync({
      id: edit?.id,
      name: fd.get("name"),
      contact_name: fd.get("contact_name") || null,
      email: fd.get("email") || null,
      phone: fd.get("phone") || null,
      notes: fd.get("notes") || null,
    });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Grands comptes"
        description="Regroupez plusieurs clients et suivez leurs statistiques consolidées."
        actions={
          <Button
            onClick={() => {
              setEdit({});
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouveau grand compte
          </Button>
        }
      />

      {grandAccounts.length === 0 ? (
        <EmptyState
          title="Aucun grand compte"
          description="Créez un regroupement, puis rattachez-y des clients depuis leur fiche."
          action={<Button onClick={() => setOpen(true)}>Créer un grand compte</Button>}
        />
      ) : (
        <div className="grid gap-4">
          {grandAccounts.map((account: any) => {
            const rows = statsByClient.filter((row) => row.client.grand_account_id === account.id);
            const totals = rows.reduce(
              (acc, row) => ({
                clients: acc.clients + 1,
                sites: acc.sites + row.siteCount,
                installations: acc.installations + row.installationCount,
                revenue: acc.revenue + row.revenue,
                openTickets: acc.openTickets + row.openTicketCount,
                tickets: acc.tickets + row.totalTicketCount,
                weightedMargin: acc.weightedMargin + row.marginRate * row.revenue,
              }),
              {
                clients: 0,
                sites: 0,
                installations: 0,
                revenue: 0,
                openTickets: 0,
                tickets: 0,
                weightedMargin: 0,
              },
            );
            const marginRate = totals.revenue > 0 ? totals.weightedMargin / totals.revenue : 0;

            return (
              <Card key={account.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-4 w-4 text-primary" />
                      {account.name}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[account.contact_name, account.email, account.phone]
                        .filter(Boolean)
                        .join(" · ") || "Aucun contact renseigné"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEdit(account);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        confirm(`Supprimer ${account.name} ?`) && remove.mutate(account.id)
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <Stat icon={Users} label="Clients" value={totals.clients} />
                    <Stat icon={Wrench} label="Installations" value={totals.installations} />
                    <Stat icon={Euro} label="CA total HT" value={formatCurrency(totals.revenue)} />
                    <Stat icon={Euro} label="Marge totale" value={formatPercent(marginRate)} />
                    <Stat
                      icon={Ticket}
                      label="Tickets ouverts"
                      value={`${totals.openTickets}/${totals.tickets}`}
                    />
                  </div>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Client</th>
                          <th className="px-3 py-2">Sites</th>
                          <th className="px-3 py-2">Install.</th>
                          <th className="px-3 py-2">CA HT</th>
                          <th className="px-3 py-2">Marge</th>
                          <th className="px-3 py-2">Tickets ouverts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.client.id} className="border-t">
                            <td className="px-3 py-2 font-medium">{row.client.name}</td>
                            <td className="px-3 py-2">{row.siteCount}</td>
                            <td className="px-3 py-2">{row.installationCount}</td>
                            <td className="px-3 py-2">{formatCurrency(row.revenue)}</td>
                            <td className="px-3 py-2">{formatPercent(row.marginRate)}</td>
                            <td className="px-3 py-2">
                              {row.openTicketCount}/{row.totalTicketCount}
                            </td>
                          </tr>
                        ))}
                        {rows.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                              Aucun client rattaché.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Modifier" : "Nouveau"} grand compte</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Nom *</Label>
              <Input name="name" required defaultValue={edit?.name} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Contact</Label>
                <Input name="contact_name" defaultValue={edit?.contact_name} />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input name="phone" defaultValue={edit?.phone} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" defaultValue={edit?.email} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea name="notes" rows={3} defaultValue={edit?.notes} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
