import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useList, useUpsert, useRemove } from "@/lib/db-hooks";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, MapPin, ChevronRight, Pencil, Trash2, Download, Upload } from "lucide-react";
import { downloadCsv, importCsvFile, pick } from "@/lib/csv";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sites")({
  component: SitesPage,
});

function SitesPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isDetailRoute = pathname.startsWith("/site/");

  return isDetailRoute ? <Outlet /> : <SitesList />;
}

function SitesList() {
  const { data: sites = [] } = useList<any>("sites", { orderBy: "name", ascending: true });
  const { data: clients = [] } = useList<any>("clients");
  const upsert = useUpsert("sites");
  const remove = useRemove("sites");
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const exportSites = () =>
    downloadCsv(
      "sites_installations.csv",
      sites.map((site: any) => {
        const client = clients.find((c: any) => c.id === site.client_id);
        return {
          numero_site: site.site_number,
          nom_site: site.name,
          adresse: site.address,
          email_site: site.email,
          contact_site: site.contact_name,
          telephone_site: site.contact_phone,
          numero_client: client?.client_number,
          nom_client: client?.name,
          notes: site.notes,
        };
      }),
      [
        "numero_site",
        "nom_site",
        "adresse",
        "email_site",
        "contact_site",
        "telephone_site",
        "numero_client",
        "nom_client",
        "notes",
      ],
    );

  const importSites = () =>
    importCsvFile(async (rows) => {
      const { data: userData } = await supabase.auth.getUser();
      const owner_id = userData.user?.id;
      if (!owner_id) return toast.error("Non authentifié");
      const clientCache = new Map(
        clients.map((c: any) => [c.client_number || c.name.toLowerCase(), c]),
      );
      for (const row of rows) {
        const siteName = pick(row, "nom_site", "site_name", "nom");
        if (!siteName) continue;
        const clientNumber = pick(row, "numero_client", "client_number");
        const clientName = pick(row, "nom_client", "client_name");
        let client =
          (clientNumber && clientCache.get(clientNumber)) ||
          (clientName && clientCache.get(clientName.toLowerCase()));
        if (!client && clientName) {
          const { data } = await (supabase.from("clients") as any)
            .insert({ owner_id, name: clientName })
            .select()
            .single();
          client = data;
          clientCache.set(client.name.toLowerCase(), client);
        }
        if (!client) continue;
        const payload = {
          owner_id,
          client_id: client.id,
          name: siteName,
          address: pick(row, "adresse", "address") || null,
          email: pick(row, "email_site", "email") || null,
          contact_name: pick(row, "contact_site", "contact_name") || null,
          contact_phone: pick(row, "telephone_site", "contact_phone") || null,
          notes: pick(row, "notes") || null,
        };
        const number = pick(row, "numero_site", "site_number");
        const existing = sites.find(
          (s: any) =>
            (number && s.site_number === number) ||
            (s.client_id === client.id && s.name.toLowerCase() === siteName.toLowerCase()),
        );
        if (existing) await (supabase.from("sites") as any).update(payload).eq("id", existing.id);
        else await (supabase.from("sites") as any).insert(payload);
      }
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["sites"] });
      toast.success("Sites importés");
    });

  const filtered = sites.filter((s) => {
    const client = clients.find((c) => c.id === s.client_id);
    return [s.site_number, s.name, s.address, s.email, client?.client_number, client?.name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase());
  });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await upsert.mutateAsync({
      id: edit.id,
      client_id: edit.client_id,
      name: fd.get("name"),
      address: fd.get("address") || null,
      email: fd.get("email") || null,
      contact_name: fd.get("contact_name") || null,
      contact_phone: fd.get("contact_phone") || null,
      notes: fd.get("notes") || null,
    });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Sites"
        description="Tous les sites, tous clients confondus"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportSites}>
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
            <Button variant="outline" onClick={importSites}>
              <Upload className="mr-2 h-4 w-4" />
              Importer CSV
            </Button>
          </div>
        }
      />
      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher..."
          className="pl-9"
        />
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="Aucun site" description="Créez des clients et ajoutez-leur des sites." />
      ) : (
        <div className="grid gap-3">
          {filtered.map((s) => {
            const client = clients.find((c) => c.id === s.client_id);
            return (
              <Card key={s.id} className="p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <Link
                    to="/site/$siteSlug"
                    params={{ siteSlug: s.site_number ?? s.id }}
                    className="min-w-0"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="shrink-0 rounded-md bg-primary/10 p-2 text-primary">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {s.site_number ? `${s.site_number} · ` : ""}
                          {s.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {client?.name} · {s.address || "—"}
                        </div>
                        {(s.email || s.contact_name) && (
                          <div className="truncate text-xs text-muted-foreground">
                            {[s.contact_name, s.contact_phone, s.email].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEdit(s);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Supprimer ${s.name} ?`)) remove.mutate(s.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Link to="/site/$siteSlug" params={{ siteSlug: s.site_number ?? s.id }}>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Modifier le site</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Nom *</Label>
              <Input name="name" required defaultValue={edit?.name} />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input name="address" defaultValue={edit?.address} />
            </div>
            <div>
              <Label>Email du site</Label>
              <Input name="email" type="email" defaultValue={edit?.email} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Contact principal</Label>
                <Input name="contact_name" defaultValue={edit?.contact_name} />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input name="contact_phone" defaultValue={edit?.contact_phone} />
              </div>
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
