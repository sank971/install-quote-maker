import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useList, useUpsert, useRemove } from "@/lib/db-hooks";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Wrench, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/installations")({
  component: Page,
});

function Page() {
  const { data: installs = [] } = useList<any>("installations", { orderBy: "name", ascending: true });
  const { data: sites = [] } = useList<any>("sites");
  const { data: clients = [] } = useList<any>("clients");
  const { data: types = [] } = useList<any>("installation_types", { orderBy: "name", ascending: true });
  const { data: brands = [] } = useList<any>("brands", { orderBy: "name", ascending: true });
  const { data: models = [] } = useList<any>("models");
  const { data: contracts = [] } = useList<any>("contracts");
  const upsert = useUpsert("installations");
  const remove = useRemove("installations");

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [brandId, setBrandId] = useState<string>("");

  const filtered = installs.filter((i) => {
    const site = sites.find((s) => s.id === i.site_id);
    const client = clients.find((c) => c.id === site?.client_id);
    return [i.name, i.serial_number, site?.name, client?.name].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase());
  });

  const openNew = () => { setEdit({}); setBrandId(""); setOpen(true); };
  const openEdit = (i: any) => { setEdit(i); setBrandId(i.brand_id ?? ""); setOpen(true); };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await upsert.mutateAsync({
      id: edit.id,
      name: fd.get("name"),
      site_id: fd.get("site_id"),
      type_id: fd.get("type_id") || null,
      brand_id: fd.get("brand_id") || null,
      model_id: fd.get("model_id") || null,
      serial_number: fd.get("serial_number") || null,
      year: fd.get("year") ? Number(fd.get("year")) : null,
      location: fd.get("location") || null,
      contract_id: fd.get("contract_id") || null,
      notes: fd.get("notes") || null,
    });
    setOpen(false);
  };

  const brandModels = models.filter((m: any) => m.brand_id === brandId);

  return (
    <div>
      <PageHeader
        title="Installations"
        description="Portes, portails et fermetures suivies"
        actions={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouvelle installation</Button>}
      />
      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher..." className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Aucune installation" description="Ajoutez une installation à un site." action={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouvelle installation</Button>} />
      ) : (
        <div className="grid gap-3">
          {filtered.map((i) => {
            const site = sites.find((s) => s.id === i.site_id);
            const client = clients.find((c) => c.id === site?.client_id);
            const type = types.find((t: any) => t.id === i.type_id);
            const brand = brands.find((b: any) => b.id === i.brand_id);
            const model = models.find((m: any) => m.id === i.model_id);
            return (
              <Card key={i.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary"><Wrench className="h-4 w-4" /></div>
                    <div>
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[type?.name, brand?.name, model?.name].filter(Boolean).join(" · ") || "—"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        <Link to="/clients/$clientId" params={{ clientId: site?.client_id }} className="hover:underline">{client?.name}</Link>
                        {" · "}{site?.name}
                        {i.serial_number && ` · SN ${i.serial_number}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Supprimer ?")) remove.mutate(i.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Modifier" : "Nouvelle"} installation</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Nom *</Label><Input name="name" required defaultValue={edit?.name} /></div>
              <div>
                <Label>Site *</Label>
                <select name="site_id" required defaultValue={edit?.site_id ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                  <option value="">—</option>
                  {sites.map((s: any) => {
                    const c = clients.find((x) => x.id === s.client_id);
                    return <option key={s.id} value={s.id}>{c?.name} — {s.name}</option>;
                  })}
                </select>
              </div>
              <div>
                <Label>Type</Label>
                <select name="type_id" defaultValue={edit?.type_id ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                  <option value="">—</option>
                  {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Marque</Label>
                <select name="brand_id" value={brandId} onChange={(e) => setBrandId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                  <option value="">—</option>
                  {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Modèle</Label>
                <select name="model_id" defaultValue={edit?.model_id ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                  <option value="">—</option>
                  {brandModels.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div><Label>N° de série</Label><Input name="serial_number" defaultValue={edit?.serial_number} /></div>
              <div><Label>Année</Label><Input name="year" type="number" defaultValue={edit?.year} /></div>
              <div><Label>Localisation sur site</Label><Input name="location" defaultValue={edit?.location} /></div>
              <div>
                <Label>Contrat</Label>
                <select name="contract_id" defaultValue={edit?.contract_id ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                  <option value="">Aucun</option>
                  {contracts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea name="notes" rows={3} defaultValue={edit?.notes} /></div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
