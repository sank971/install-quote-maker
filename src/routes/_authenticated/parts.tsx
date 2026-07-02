import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useList, useUpsert, useRemove } from "@/lib/db-hooks";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Package, Pencil, Trash2, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/parts")({
  component: PartsPage,
});

function PartsPage() {
  const { data: parts = [] } = useList<any>("parts", { orderBy: "name", ascending: true });
  const { data: brands = [] } = useList<any>("brands", { orderBy: "name", ascending: true });
  const { data: models = [] } = useList<any>("models");
  const { data: compat = [] } = useList<any>("part_model_compat", { orderBy: "part_id", ascending: true });
  const upsert = useUpsert("parts");
  const remove = useRemove("parts");
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [compatOpen, setCompatOpen] = useState<any>(null);

  const filtered = parts.filter((p) =>
    [p.name, p.reference, p.category].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  const openNew = () => { setEdit({}); setOpen(true); };
  const openEdit = (p: any) => { setEdit(p); setOpen(true); };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await upsert.mutateAsync({
      id: edit.id,
      name: fd.get("name"),
      reference: fd.get("reference") || null,
      category: fd.get("category") || null,
      brand_id: fd.get("brand_id") || null,
      description: fd.get("description") || null,
      sale_price: Number(fd.get("sale_price") ?? 0),
    });
    setOpen(false);
  };

  const toggleCompat = async (partId: string, modelId: string, present: boolean) => {
    const { data: userData } = await supabase.auth.getUser();
    const owner_id = userData.user!.id;
    if (present) {
      const { error } = await supabase.from("part_model_compat").delete().eq("part_id", partId).eq("model_id", modelId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("part_model_compat").insert({ part_id: partId, model_id: modelId, owner_id });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["part_model_compat"] });
  };

  return (
    <div>
      <PageHeader
        title="Pièces"
        description="Bibliothèque de pièces et compatibilités"
        actions={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouvelle pièce</Button>}
      />
      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher..." className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Aucune pièce" action={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouvelle pièce</Button>} />
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => {
            const brand = brands.find((b: any) => b.id === p.brand_id);
            const compatCount = compat.filter((c: any) => c.part_id === p.id).length;
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary"><Package className="h-4 w-4" /></div>
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[p.reference, p.category, brand?.name].filter(Boolean).join(" · ") || "—"}
                      </div>
                      <div className="mt-1 text-xs">
                        <span className="text-muted-foreground">PV : </span>
                        <span className="font-medium">{Number(p.sale_price).toFixed(2)} €</span>
                        <span className="mx-2 text-muted-foreground">·</span>
                        <span className="text-muted-foreground">Compat. : {compatCount} modèles</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setCompatOpen(p)}><LinkIcon className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Supprimer ?")) remove.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Modifier" : "Nouvelle"} pièce</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Nom *</Label><Input name="name" required defaultValue={edit?.name} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Référence</Label><Input name="reference" defaultValue={edit?.reference} /></div>
              <div><Label>Catégorie</Label><Input name="category" defaultValue={edit?.category} placeholder="Radar, moteur, carte..." /></div>
              <div>
                <Label>Marque</Label>
                <select name="brand_id" defaultValue={edit?.brand_id ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                  <option value="">—</option>
                  {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div><Label>Prix de vente (€)</Label><Input name="sale_price" type="number" step="0.01" defaultValue={edit?.sale_price ?? 0} /></div>
            </div>
            <div><Label>Description</Label><Textarea name="description" rows={3} defaultValue={edit?.description} /></div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!compatOpen} onOpenChange={(o) => !o && setCompatOpen(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Compatibilité : {compatOpen?.name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Cochez les modèles avec lesquels cette pièce est compatible.</p>
          <div className="space-y-4">
            {brands.map((b: any) => {
              const bModels = models.filter((m: any) => m.brand_id === b.id);
              if (bModels.length === 0) return null;
              return (
                <div key={b.id}>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{b.name}</div>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {bModels.map((m: any) => {
                      const present = compat.some((c: any) => c.part_id === compatOpen?.id && c.model_id === m.id);
                      return (
                        <label key={m.id} className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent">
                          <input type="checkbox" checked={present} onChange={() => toggleCompat(compatOpen.id, m.id, present)} />
                          <span>{m.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {brands.length === 0 && <p className="text-sm text-muted-foreground">Ajoutez d'abord des marques et modèles dans Paramètres.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
