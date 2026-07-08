import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useList, useUpsert, useRemove } from "@/lib/db-hooks";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search, ChevronRight, MapPin, Download, Upload } from "lucide-react";
import { downloadCsv, importCsvFile, pick } from "@/lib/csv";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { geocodeAddress } from "@/lib/stock-workflow";

export const Route = createFileRoute("/_authenticated/clients")({
  component: ClientsPage,
});

function ClientsPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isDetailRoute = pathname.startsWith("/clients/");

  return isDetailRoute ? <Outlet /> : <ClientsList />;
}

function ClientsList() {
  const { data = [] } = useList<any>("clients");
  const { data: grandAccounts = [] } = useList<any>("grand_accounts", {
    orderBy: "name",
    ascending: true,
  });
  const qc = useQueryClient();
  const upsert = useUpsert("clients");
  const upsertSite = useUpsert("sites", [["sites"]]);
  const remove = useRemove("clients");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [siteOpen, setSiteOpen] = useState(false);
  const [siteClient, setSiteClient] = useState<any>(null);

  const exportClients = () =>
    downloadCsv(
      "clients.csv",
      data.map((c: any) => ({
        numero_client: c.client_number,
        nom: c.name,
        email: c.email,
        telephone: c.phone,
        contact: c.contact_name,
        siret: c.siret,
        adresse: c.address,
        grand_compte:
          grandAccounts.find((account: any) => account.id === c.grand_account_id)?.name ?? "",
        notes: c.notes,
      })),
      [
        "numero_client",
        "nom",
        "grand_compte",
        "email",
        "telephone",
        "contact",
        "siret",
        "adresse",
        "notes",
      ],
    );

  const importClients = () =>
    importCsvFile(async (rows) => {
      const { data: userData } = await supabase.auth.getUser();
      const owner_id = userData.user?.id;
      if (!owner_id) return toast.error("Non authentifié");
      for (const row of rows) {
        const name = pick(row, "nom", "name");
        if (!name) continue;
        const payload = {
          owner_id,
          name,
          email: pick(row, "email") || null,
          phone: pick(row, "telephone", "phone") || null,
          address: pick(row, "adresse", "address") || null,
          contact_name: pick(row, "contact", "contact_name") || null,
          siret: pick(row, "siret") || null,
          notes: pick(row, "notes") || null,
          grand_account_id:
            grandAccounts.find(
              (account: any) =>
                account.name.toLowerCase() ===
                pick(row, "grand_compte", "grand_account").toLowerCase(),
            )?.id ?? null,
        };
        const number = pick(row, "numero_client", "client_number");
        const existing = data.find(
          (c: any) =>
            (number && c.client_number === number) || c.name.toLowerCase() === name.toLowerCase(),
        );
        if (existing) await (supabase.from("clients") as any).update(payload).eq("id", existing.id);
        else await (supabase.from("clients") as any).insert(payload);
      }
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Clients importés");
    });

  const filtered = data.filter((c) =>
    [c.client_number, c.name, c.siret, c.email, c.phone, c.contact_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  const openNew = () => {
    setEdit({});
    setOpen(true);
  };
  const openEdit = (c: any) => {
    setEdit(c);
    setOpen(true);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await upsert.mutateAsync({
      id: edit.id,
      name: fd.get("name"),
      email: fd.get("email") || null,
      phone: fd.get("phone") || null,
      address: fd.get("address") || null,
      contact_name: fd.get("contact_name") || null,
      siret: fd.get("siret") || null,
      notes: fd.get("notes") || null,
      grand_account_id: fd.get("grand_account_id") || null,
    });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Gérez vos clients et leurs sites"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportClients}>
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
            <Button variant="outline" onClick={importClients}>
              <Upload className="mr-2 h-4 w-4" />
              Importer CSV
            </Button>
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau client
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher..."
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Aucun client"
          description="Ajoutez votre premier client pour commencer."
          action={
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau client
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <Link to="/clients/$clientId" params={{ clientId: c.id }} className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {c.client_number ? `${c.client_number} · ` : ""}
                        {c.name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {[
                          grandAccounts.find((account: any) => account.id === c.grand_account_id)
                            ?.name
                            ? `Grand compte ${grandAccounts.find((account: any) => account.id === c.grand_account_id)?.name}`
                            : null,
                          c.siret ? `SIRET ${c.siret}` : null,
                          c.contact_name,
                          c.email,
                          c.phone,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSiteClient(c);
                      setSiteOpen(true);
                    }}
                  >
                    <MapPin className="mr-1 h-4 w-4" />
                    Site
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Supprimer ${c.name} ?`)) remove.mutate(c.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Modifier" : "Nouveau"} client</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Nom *</Label>
              <Input name="name" required defaultValue={edit?.name} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={edit?.email} />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input name="phone" defaultValue={edit?.phone} />
              </div>
            </div>
            <div>
              <Label>Grand compte</Label>
              <select
                name="grand_account_id"
                defaultValue={edit?.grand_account_id ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Aucun grand compte</option>
                {grandAccounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Contact</Label>
                <Input name="contact_name" defaultValue={edit?.contact_name} />
              </div>
              <div>
                <Label>SIRET</Label>
                <Input name="siret" inputMode="numeric" defaultValue={edit?.siret} />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input name="address" defaultValue={edit?.address} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea name="notes" defaultValue={edit?.notes} rows={3} />
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

      <Dialog open={siteOpen} onOpenChange={setSiteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau site {siteClient?.name ? `— ${siteClient.name}` : ""}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const address = fd.get("address")?.toString() || null;
              const geocoded = await geocodeAddress({ address });
              await upsertSite.mutateAsync({
                client_id: siteClient.id,
                name: fd.get("name"),
                address,
                latitude: geocoded.latitude,
                longitude: geocoded.longitude,
                contact_name: fd.get("contact_name") || null,
                contact_phone: fd.get("contact_phone") || null,
                notes: fd.get("notes") || null,
              });
              setSiteOpen(false);
            }}
            className="space-y-3"
          >
            <div>
              <Label>Nom *</Label>
              <Input name="name" required />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input name="address" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Contact site</Label>
                <Input name="contact_name" />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input name="contact_phone" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea name="notes" rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setSiteOpen(false)}>
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
