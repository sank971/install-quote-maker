import { createFileRoute } from "@tanstack/react-router";
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
import { Plus, Search, Package, Pencil, Trash2, Link as LinkIcon, Boxes } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/parts")({
  component: PartsPage,
});

function PartsPage() {
  const { data: parts = [] } = useList<any>("parts", { orderBy: "name", ascending: true });
  const { data: brands = [] } = useList<any>("brands", { orderBy: "name", ascending: true });
  const { data: models = [] } = useList<any>("models");
  const { data: modelCompat = [] } = useList<any>("part_model_compat", {
    orderBy: "part_id",
    ascending: true,
  });
  const { data: typeCompat = [] } = useList<any>("part_type_compat", {
    orderBy: "part_id",
    ascending: true,
  });
  const { data: partComponents = [] } = useList<any>("part_components", {
    orderBy: "position",
    ascending: true,
  });
  const { data: types = [] } = useList<any>("installation_types", {
    orderBy: "name",
    ascending: true,
  });
  const { data: partCategories = [] } = useList<any>("part_categories", {
    orderBy: "name",
    ascending: true,
  });
  const upsert = useUpsert("parts");
  const remove = useRemove("parts");
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [compatOpen, setCompatOpen] = useState<any>(null);
  const [componentsOpen, setComponentsOpen] = useState<any>(null);
  const [componentDraft, setComponentDraft] = useState({
    quantity: 1,
    notes: "",
  });
  const [selectedComponentPartIds, setSelectedComponentPartIds] = useState<string[]>([]);
  const [selectedCompatTypeIds, setSelectedCompatTypeIds] = useState<string[]>([]);

  const filtered = parts.filter((p) =>
    [p.name, p.reference, p.category]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  const openNew = () => {
    setEdit({});
    setOpen(true);
  };
  const openEdit = (p: any) => {
    setEdit(p);
    setOpen(true);
  };

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
      pricing_unit: fd.get("pricing_unit") || "unit",
    });
    setOpen(false);
  };

  const toggleCompat = async (partId: string, modelId: string, present: boolean) => {
    const { data: userData } = await supabase.auth.getUser();
    const owner_id = userData.user!.id;
    if (present) {
      const { error } = await supabase
        .from("part_model_compat")
        .delete()
        .eq("part_id", partId)
        .eq("model_id", modelId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("part_model_compat")
        .insert({ part_id: partId, model_id: modelId, owner_id });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["part_model_compat"] });
  };

  const openCompat = (part: any) => {
    setCompatOpen(part);
    setSelectedCompatTypeIds(
      typeCompat.filter((c: any) => c.part_id === part.id).map((c: any) => c.type_id),
    );
  };

  const addComponents = async (parentPartId: string) => {
    if (selectedComponentPartIds.length === 0) {
      return toast.error("Sélectionnez au moins une pièce composante");
    }
    if (selectedComponentPartIds.includes(parentPartId)) {
      return toast.error("Une pièce ne peut pas être composante d’elle-même");
    }
    const { data: userData } = await supabase.auth.getUser();
    const owner_id = userData.user!.id;
    const siblings = partComponents.filter((c: any) => c.parent_part_id === parentPartId);
    const existingComponentIds = new Set(siblings.map((c: any) => c.component_part_id));
    const componentsToAdd = selectedComponentPartIds.filter((id) => !existingComponentIds.has(id));

    if (componentsToAdd.length === 0) {
      return toast.info("Toutes les pièces sélectionnées sont déjà dans cette composition");
    }

    const { error } = await (supabase.from("part_components" as any) as any).upsert(
      componentsToAdd.map((componentPartId, index) => ({
        parent_part_id: parentPartId,
        component_part_id: componentPartId,
        owner_id,
        quantity: Number(componentDraft.quantity) || 1,
        position: siblings.length + index,
        notes: componentDraft.notes || null,
      })),
    );
    if (error) return toast.error(error.message);
    setComponentDraft({ quantity: 1, notes: "" });
    setSelectedComponentPartIds([]);
    qc.invalidateQueries({ queryKey: ["part_components"] });
    toast.success(
      componentsToAdd.length > 1
        ? `${componentsToAdd.length} composants ajoutés`
        : "Composant ajouté",
    );
  };

  const toggleSelectedComponent = (componentPartId: string) => {
    setSelectedComponentPartIds((current) =>
      current.includes(componentPartId)
        ? current.filter((id) => id !== componentPartId)
        : [...current, componentPartId],
    );
  };

  const removeComponent = async (parentPartId: string, componentPartId: string) => {
    const { error } = await (supabase.from("part_components" as any) as any)
      .delete()
      .eq("parent_part_id", parentPartId)
      .eq("component_part_id", componentPartId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["part_components"] });
    toast.success("Composant supprimé");
  };

  const toggleTypeCompat = async (partId: string, typeId: string, present: boolean) => {
    setSelectedCompatTypeIds((current) =>
      present ? current.filter((id) => id !== typeId) : [...current, typeId],
    );
    const { data: userData } = await supabase.auth.getUser();
    const owner_id = userData.user!.id;
    if (present) {
      const { error } = await supabase
        .from("part_type_compat")
        .delete()
        .eq("part_id", partId)
        .eq("type_id", typeId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("part_type_compat")
        .insert({ part_id: partId, type_id: typeId, owner_id });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["part_type_compat"] });
  };

  return (
    <div>
      <PageHeader
        title="Pièces"
        description="Bibliothèque de pièces et compatibilités"
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle pièce
          </Button>
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
        <EmptyState
          title="Aucune pièce"
          action={
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle pièce
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => {
            const brand = brands.find((b: any) => b.id === p.brand_id);
            const modelCompatCount = modelCompat.filter((c: any) => c.part_id === p.id).length;
            const typeCompatCount = typeCompat.filter((c: any) => c.part_id === p.id).length;
            const componentCount = partComponents.filter(
              (c: any) => c.parent_part_id === p.id,
            ).length;
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[p.reference, p.category, brand?.name].filter(Boolean).join(" · ") || "—"}
                      </div>
                      <div className="mt-1 text-xs">
                        <span className="text-muted-foreground">PV : </span>
                        <span className="font-medium">
                          {Number(p.sale_price).toFixed(2)} €/
                          {p.pricing_unit === "linear_meter" ? "ml" : "u"}
                        </span>
                        <span className="mx-2 text-muted-foreground">·</span>
                        <span className="text-muted-foreground">
                          Compat. : {typeCompatCount} types · {modelCompatCount} modèles
                        </span>
                        {componentCount > 0 && (
                          <>
                            <span className="mx-2 text-muted-foreground">·</span>
                            <span className="text-muted-foreground">
                              Composé : {componentCount} pièces
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setComponentsOpen(p);
                        setSelectedComponentPartIds([]);
                        setComponentDraft({ quantity: 1, notes: "" });
                      }}
                      title="Composer cette pièce"
                    >
                      <Boxes className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openCompat(p)}>
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Supprimer ?")) remove.mutate(p.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Modifier" : "Nouvelle"} pièce</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Nom *</Label>
              <Input name="name" required defaultValue={edit?.name} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Référence</Label>
                <Input name="reference" defaultValue={edit?.reference} />
              </div>
              <div>
                <Label>Type de pièce</Label>
                <select
                  name="category"
                  defaultValue={edit?.category ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">—</option>
                  {partCategories.map((category: any) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Marque</Label>
                <select
                  name="brand_id"
                  defaultValue={edit?.brand_id ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">—</option>
                  {brands.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Prix de vente (€)</Label>
                <Input
                  name="sale_price"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.sale_price ?? 0}
                />
              </div>
              <div>
                <Label>Chiffrage</Label>
                <select
                  name="pricing_unit"
                  defaultValue={edit?.pricing_unit ?? "unit"}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="unit">À l’unité</option>
                  <option value="linear_meter">Au mètre linéaire</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea name="description" rows={3} defaultValue={edit?.description} />
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

      <Dialog
        open={!!componentsOpen}
        onOpenChange={(o) => {
          if (!o) {
            setComponentsOpen(null);
            setSelectedComponentPartIds([]);
            setComponentDraft({ quantity: 1, notes: "" });
          }
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Composition : {componentsOpen?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Déclarez les pièces incluses dans cette référence composée. Exemple : un vantail 20VR
            peut contenir 5 pièces remplaçables individuellement dans un devis.
          </p>
          <div className="space-y-2">
            {partComponents
              .filter((component: any) => component.parent_part_id === componentsOpen?.id)
              .map((component: any) => {
                const part = parts.find(
                  (candidate: any) => candidate.id === component.component_part_id,
                );
                return (
                  <div
                    key={component.component_part_id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 p-2 text-sm"
                  >
                    <div>
                      <div className="font-medium">{part?.name ?? "Pièce inconnue"}</div>
                      <div className="text-xs text-muted-foreground">
                        Qté {component.quantity} {part?.reference ? `· Réf. ${part.reference}` : ""}{" "}
                        {component.notes ? `· ${component.notes}` : ""}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        removeComponent(componentsOpen.id, component.component_part_id)
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
          </div>
          <div className="space-y-3 rounded-md border border-border/60 p-3">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ajouter plusieurs pièces composantes
              </div>
              <div className="grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {parts
                  .filter((part: any) => part.id !== componentsOpen?.id)
                  .map((part: any) => {
                    const alreadyInComposition = partComponents.some(
                      (component: any) =>
                        component.parent_part_id === componentsOpen?.id &&
                        component.component_part_id === part.id,
                    );
                    return (
                      <label
                        key={part.id}
                        className="flex items-start gap-2 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selectedComponentPartIds.includes(part.id)}
                          disabled={alreadyInComposition}
                          onChange={() => toggleSelectedComponent(part.id)}
                        />
                        <span>
                          <span className="font-medium">{part.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {[
                              part.reference,
                              part.category,
                              alreadyInComposition ? "déjà ajouté" : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </span>
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[90px_1fr_auto]">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={componentDraft.quantity}
                onChange={(e) =>
                  setComponentDraft((draft) => ({ ...draft, quantity: Number(e.target.value) }))
                }
                placeholder="Qté"
              />
              <Input
                value={componentDraft.notes}
                onChange={(e) =>
                  setComponentDraft((draft) => ({ ...draft, notes: e.target.value }))
                }
                placeholder="Note commune"
              />
              <Button type="button" onClick={() => addComponents(componentsOpen.id)}>
                Ajouter {selectedComponentPartIds.length > 1 ? selectedComponentPartIds.length : ""}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!compatOpen}
        onOpenChange={(o) => {
          if (!o) {
            setCompatOpen(null);
            setSelectedCompatTypeIds([]);
          }
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compatibilité : {compatOpen?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cochez d’abord un ou plusieurs types d’installation, puis sélectionnez les modèles
            compatibles parmi les marques filtrées par ces types.
          </p>
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Types d’installation
              </div>
              {types.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ajoutez d’abord des types dans Paramètres.
                </p>
              ) : (
                <div className="grid gap-1 sm:grid-cols-2">
                  {types.map((t: any) => {
                    const present = typeCompat.some(
                      (c: any) => c.part_id === compatOpen?.id && c.type_id === t.id,
                    );
                    return (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={present}
                          onChange={() => toggleTypeCompat(compatOpen.id, t.id, present)}
                        />
                        <span>{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Modèles d’installation
            </div>
            {selectedCompatTypeIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sélectionnez au moins un type d’installation pour afficher les marques et modèles
                disponibles.
              </p>
            ) : null}
            {brands.map((b: any) => {
              const bModels = models.filter(
                (m: any) => m.brand_id === b.id && selectedCompatTypeIds.includes(m.type_id),
              );
              if (bModels.length === 0) return null;
              return (
                <div key={b.id}>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {b.name}
                  </div>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {bModels.map((m: any) => {
                      const present = modelCompat.some(
                        (c: any) => c.part_id === compatOpen?.id && c.model_id === m.id,
                      );
                      return (
                        <label
                          key={m.id}
                          className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
                        >
                          <input
                            type="checkbox"
                            checked={present}
                            onChange={() => toggleCompat(compatOpen.id, m.id, present)}
                          />
                          <span>
                            {types.find((t: any) => t.id === m.type_id)?.name} · {m.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {brands.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ajoutez d'abord des marques et modèles dans Paramètres.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
