import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useList } from "@/lib/db-hooks";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, MapPin, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sites")({
  component: SitesPage,
});

function SitesPage() {
  const { data: sites = [] } = useList<any>("sites", { orderBy: "name", ascending: true });
  const { data: clients = [] } = useList<any>("clients");
  const [q, setQ] = useState("");

  const filtered = sites.filter((s) => {
    const client = clients.find((c) => c.id === s.client_id);
    return [s.name, s.address, client?.name].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div>
      <PageHeader title="Sites" description="Tous les sites, tous clients confondus" />
      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher..." className="pl-9" />
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="Aucun site" description="Créez des clients et ajoutez-leur des sites." />
      ) : (
        <div className="grid gap-3">
          {filtered.map((s) => {
            const client = clients.find((c) => c.id === s.client_id);
            return (
              <Link key={s.id} to="/clients/$clientId" params={{ clientId: s.client_id }}>
                <Card className="p-4 hover:bg-accent/50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-md bg-primary/10 p-2 text-primary"><MapPin className="h-4 w-4" /></div>
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{client?.name} · {s.address || "—"}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
