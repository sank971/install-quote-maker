import { createFileRoute, Link } from "@tanstack/react-router";
import { useList } from "@/lib/db-hooks";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, FileText, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/quotes/")({
  component: QuotesList,
});

function QuotesList() {
  const { data: quotes = [] } = useList<any>("quotes");
  const { data: clients = [] } = useList<any>("clients");
  const { data: items = [] } = useList<any>("quote_items");

  const total = (q: any) => {
    const it = items.filter((i: any) => i.quote_id === q.id);
    const parts = it.reduce(
      (s: number, i: any) => s + Number(i.unit_price) * Number(i.quantity),
      0,
    );
    const labor =
      Number(q.labor_hours ?? 0) * Number(q.travel_count ?? 1) * Number(q.labor_rate ?? 0);
    const ht = parts + labor + Number(q.travel_fee ?? 0);
    return ht * (1 + Number(q.vat_rate ?? 20) / 100);
  };

  return (
    <div>
      <PageHeader
        title="Devis"
        description="Historique de vos devis"
        actions={
          <Button asChild>
            <Link to="/quotes/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau devis
            </Link>
          </Button>
        }
      />
      {quotes.length === 0 ? (
        <EmptyState
          title="Aucun devis"
          action={
            <Button asChild>
              <Link to="/quotes/new">
                <Plus className="mr-2 h-4 w-4" />
                Créer
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {quotes.map((q: any) => {
            const client = clients.find((c: any) => c.id === q.client_id);
            return (
              <Link key={q.id} to="/quotes/$quoteId" params={{ quoteId: q.id }}>
                <Card className="p-4 hover:bg-accent/50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-md bg-primary/10 p-2 text-primary">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{q.quote_number}</div>
                        <div className="text-xs text-muted-foreground">
                          {client?.name} · {new Date(q.issued_at).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{total(q).toFixed(2)} € TTC</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs uppercase tracking-wider">
                        {q.status}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
