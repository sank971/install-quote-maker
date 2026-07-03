import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useList, useUpsert, useRemove } from "@/lib/db-hooks";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search, ChevronRight, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clients")({
  component: ClientsPage,
});

function ClientsPage() {
  const { data = [] } = useList<any>("clients");
  const upsert = useUpsert("clients");
  const remove = useRemove("clients");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const filtered = data.filter((c) =>
    [c.name, c.email, c.phone, c.contact_name].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  const openNew = () => { setEdit({}); setOpen(true); };
  const openEdit = (c: any) => { setEdit(c); setOpen(true); };

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
      notes: fd.get("notes") || null,
    });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Gérez vos clients et leurs sites"
        actions={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouveau client</Button>}
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher..." className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Aucun client" description="Ajoutez votre premier client pour commencer." action={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouveau client</Button>} />
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <Link to="/clients/$clientId" params={{ clientId: c.id }} className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {[c.contact_name, c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Supprimer ${c.name} ?`)) remove.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Modifier" : "Nouveau"} client</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Nom *</Label><Input name="name" required defaultValue={edit?.name} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Email</Label><Input name="email" type="email" defaultValue={edit?.email} /></div>
              <div><Label>Téléphone</Label><Input name="phone" defaultValue={edit?.phone} /></div>
            </div>
            <div><Label>Contact</Label><Input name="contact_name" defaultValue={edit?.contact_name} /></div>
            <div><Label>Adresse</Label><Input name="address" defaultValue={edit?.address} /></div>
            <div><Label>Notes</Label><Textarea name="notes" defaultValue={edit?.notes} rows={3} /></div>
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
