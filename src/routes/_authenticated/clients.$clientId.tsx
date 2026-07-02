import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useOne, useList, useUpsert, useRemove } from "@/lib/db-hooks";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ChevronLeft, MapPin, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/clients/$clientId")({
  component: ClientDetail,
});

function ClientDetail() {
  const { clientId } = Route.useParams();
  const { data: client } = useOne<any>("clients", clientId);
  const { data: sites = [] } = useQuery({
    queryKey: ["sites", "byClient", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").eq("client_id", clientId).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const upsertSite = useUpsert("sites", [["sites"], ["sites", "byClient", clientId]]);
  const removeSite = useRemove("sites", [["sites"], ["sites", "byClient", clientId]]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const openNew = () => { setEdit({}); setOpen(true); };
  const openEdit = (s: any) => { setEdit(s); setOpen(true); };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await upsertSite.mutateAsync({
      id: edit.id,
      client_id: clientId,
      name: fd.get("name"),
      address: fd.get("address") || null,
      contact_name: fd.get("contact_name") || null,
      contact_phone: fd.get("contact_phone") || null,
      notes: fd.get("notes") || null,
    });
    setOpen(false);
  };

  if (!client) return <p className="text-muted-foreground">Chargement...</p>;

  return (
    <div>
      <Link to="/clients" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Clients
      </Link>
      <PageHeader
        title={client.name}
        description={[client.contact_name, client.email, client.phone].filter(Boolean).join(" · ")}
        actions={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouveau site</Button>}
      />

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div><span className="text-muted-foreground">Adresse :</span> {client.address || "—"}</div>
          <div><span className="text-muted-foreground">Notes :</span> {client.notes || "—"}</div>
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sites ({sites.length})</h2>

      {sites.length === 0 ? (
        <EmptyState title="Aucun site" description="Ajoutez un site pour ce client." />
      ) : (
        <div className="grid gap-3">
          {sites.map((s: any) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2 text-primary"><MapPin className="h-4 w-4" /></div>
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.address || "—"}</div>
                    {s.contact_name && <div className="text-xs text-muted-foreground">{s.contact_name} · {s.contact_phone}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Supprimer ${s.name} ?`)) removeSite.mutate(s.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Modifier" : "Nouveau"} site</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Nom *</Label><Input name="name" required defaultValue={edit?.name} /></div>
            <div><Label>Adresse</Label><Input name="address" defaultValue={edit?.address} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Contact site</Label><Input name="contact_name" defaultValue={edit?.contact_name} /></div>
              <div><Label>Téléphone</Label><Input name="contact_phone" defaultValue={edit?.contact_phone} /></div>
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
