import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Plus, Search, Wrench, Pencil, Trash2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type CustomField = { key: string; label: string; type: "text" | "number" | "date" | "checkbox" };

export const Route = createFileRoute("/_authenticated/installations")({
  component: Page,
});

function Page() {
  const { data: installs = [] } = useList<any>("installations", {
    orderBy: "name",
    ascending: true,
  });
  const { data: sites = [] } = useList<any>("sites");
  const { data: clients = [] } = useList<any>("clients");
  const { data: types = [] } = useList<any>("installation_types", {
    orderBy: "name",
    ascending: true,
  });
  const { data: brands = [] } = useList<any>("brands", { orderBy: "name", ascending: true });
  const { data: models = [] } = useList<any>("models");
  const { data: contracts = [] } = useList<any>("contracts");
  const { data: parts = [] } = useList<any>("parts", { orderBy: "name", ascending: true });
  const { data: modelCompat = [] } = useList<any>("part_model_compat");
  const { data: typeCompat = [] } = useList<any>("part_type_compat");
  const { data: installationParts = [] } = useList<any>("installation_parts");
  const upsert = useUpsert("installations");
  const remove = useRemove("installations");
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [brandId, setBrandId] = useState<string>("");
  const [typeId, setTypeId] = useState<string>("");
  const [modelId, setModelId] = useState<string>("");
  const [partsOpen, setPartsOpen] = useState<any>(null);

  const getCompatibleParts = (installation: any) => {
    if (!installation?.id) return [];
    const ids = new Set<string>();
    if (installation.model_id) {
      modelCompat
        .filter((c: any) => c.model_id === installation.model_id)
        .forEach((c: any) => ids.add(c.part_id));
    }
    if (installation.type_id) {
      typeCompat
        .filter((c: any) => c.type_id === installation.type_id)
        .forEach((c: any) => ids.add(c.part_id));
    }
    return parts.filter((p: any) => ids.has(p.id));
  };

  const getPresentParts = (installationId: string) =>
    installationParts
      .filter((x: any) => x.installation_id === installationId)
      .map((x: any) => ({ ...x, part: parts.find((p: any) => p.id === x.part_id) }))
      .filter((x: any) => x.part);

  const toggleInstallationPart = async (
    installationId: string,
    partId: string,
    present: boolean,
  ) => {
    const { data: userData } = await supabase.auth.getUser();
    const owner_id = userData.user!.id;
    const table = supabase.from("installation_parts" as any) as any;
    const { error } = present
      ? await table.delete().eq("installation_id", installationId).eq("part_id", partId)
      : await table.insert({ installation_id: installationId, part_id: partId, owner_id });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["installation_parts"] });
  };

  const filtered = installs.filter((i) => {
    const site = sites.find((s) => s.id === i.site_id);
    const client = clients.find((c) => c.id === site?.client_id);
    return [i.name, i.serial_number, site?.name, client?.name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase());
  });

  const openNew = () => {
    setEdit({ characteristics: {} });
    setBrandId("");
    setTypeId("");
    setModelId("");
    setOpen(true);
  };
  const openEdit = (i: any) => {
    setEdit({ ...i, characteristics: i.characteristics ?? {} });
    setBrandId(i.brand_id ?? "");
    setTypeId(i.type_id ?? "");
    setModelId(i.model_id ?? "");
    setOpen(true);
  };

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
      characteristics: selectedTypeFields.reduce((acc: Record<string, any>, field) => {
        const value = fd.get(`characteristic_${field.key}`);
        acc[field.key] = field.type === "checkbox" ? value === "on" : value || null;
        return acc;
      }, {}),
    });
    setOpen(false);
  };

  const brandModels = models.filter(
    (m: any) => m.brand_id === brandId && (!typeId || m.type_id === typeId),
  );
  const selectedType = types.find((t: any) => t.id === typeId);
  const selectedTypeFields: CustomField[] = selectedType?.custom_fields ?? [];

  return (
    <div>
      <PageHeader
        title="Installations"
        description="Portes, portails et fermetures suivies"
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle installation
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
          title="Aucune installation"
          description="Ajoutez une installation à un site."
          action={
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle installation
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((i) => {
            const site = sites.find((s) => s.id === i.site_id);
            const client = clients.find((c) => c.id === site?.client_id);
            const type = types.find((t: any) => t.id === i.type_id);
            const brand = brands.find((b: any) => b.id === i.brand_id);
            const model = models.find((m: any) => m.id === i.model_id);
            const presentParts = getPresentParts(i.id);
            return (
              <Card key={i.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[type?.name, brand?.name, model?.name].filter(Boolean).join(" · ") || "—"}
                      </div>
                      {type?.component_types?.length ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Pièces: {type.component_types.join(", ")}
                        </div>
                      ) : null}
                      {presentParts.length ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {presentParts.slice(0, 4).map((x: any) => (
                            <span
                              key={x.part_id}
                              className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
                            >
                              {x.part.name}
                            </span>
                          ))}
                          {presentParts.length > 4 ? (
                            <span className="rounded bg-muted px-2 py-0.5 text-xs">
                              +{presentParts.length - 4}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {type?.custom_fields?.length ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {type.custom_fields.map((field: CustomField) => {
                            const value = i.characteristics?.[field.key];
                            if (value === undefined || value === null || value === "") return null;
                            return (
                              <span
                                key={field.key}
                                className="rounded bg-muted px-2 py-0.5 text-xs"
                              >
                                {field.label}:{" "}
                                {field.type === "checkbox" ? (value ? "Oui" : "Non") : value}
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                      <div className="mt-1 text-xs text-muted-foreground">
                        <Link
                          to="/clients/$clientId"
                          params={{ clientId: site?.client_id }}
                          className="hover:underline"
                        >
                          {client?.name}
                        </Link>
                        {" · "}
                        {site?.name}
                        {i.serial_number && ` · SN ${i.serial_number}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setPartsOpen(i)}>
                      <Package className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(i)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Supprimer ?")) remove.mutate(i.id);
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
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Modifier" : "Nouvelle"} installation</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Nom *</Label>
                <Input name="name" required defaultValue={edit?.name} />
              </div>
              <div>
                <Label>Site *</Label>
                <select
                  name="site_id"
                  required
                  defaultValue={edit?.site_id ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">—</option>
                  {sites.map((s: any) => {
                    const c = clients.find((x) => x.id === s.client_id);
                    return (
                      <option key={s.id} value={s.id}>
                        {c?.name} — {s.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <Label>Type</Label>
                <select
                  name="type_id"
                  value={typeId}
                  onChange={(e) => {
                    setTypeId(e.target.value);
                    setModelId("");
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">—</option>
                  {types.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Marque</Label>
                <select
                  name="brand_id"
                  value={brandId}
                  onChange={(e) => {
                    setBrandId(e.target.value);
                    setModelId("");
                  }}
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
                <Label>Modèle</Label>
                <select
                  name="model_id"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  disabled={!typeId || !brandId}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">
                    {!typeId || !brandId ? "Choisir un type et une marque" : "—"}
                  </option>
                  {brandModels.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>N° de série</Label>
                <Input name="serial_number" defaultValue={edit?.serial_number} />
              </div>
              <div>
                <Label>Année</Label>
                <Input name="year" type="number" defaultValue={edit?.year} />
              </div>
              <div>
                <Label>Localisation sur site</Label>
                <Input name="location" defaultValue={edit?.location} />
              </div>
              {selectedType?.component_types?.length ? (
                <div className="sm:col-span-2 rounded-md border border-border/60 p-3 text-sm">
                  <Label>Types de pièces / organes liés à ce type</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedType.component_types.map((name: string) => (
                      <span key={name} className="rounded-md bg-muted px-2 py-1 text-xs">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {selectedTypeFields.map((field) => (
                <div key={field.key}>
                  <Label>{field.label}</Label>
                  {field.type === "checkbox" ? (
                    <input
                      name={`characteristic_${field.key}`}
                      type="checkbox"
                      defaultChecked={Boolean(edit?.characteristics?.[field.key])}
                      className="mt-3 h-4 w-4"
                    />
                  ) : (
                    <Input
                      name={`characteristic_${field.key}`}
                      type={field.type}
                      defaultValue={edit?.characteristics?.[field.key] ?? ""}
                    />
                  )}
                </div>
              ))}
              <div>
                <Label>Contrat</Label>
                <select
                  name="contract_id"
                  defaultValue={edit?.contract_id ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Aucun</option>
                  {contracts.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
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

      <Dialog open={!!partsOpen} onOpenChange={(o) => !o && setPartsOpen(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pièces présentes : {partsOpen?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cochez les pièces réellement présentes sur cette installation. Les pièces compatibles
            avec son type ou son modèle sont suggérées pour accélérer les futurs devis.
          </p>
          {partsOpen ? (
            <div className="space-y-4">
              {getCompatibleParts(partsOpen).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune pièce compatible trouvée. Ajoutez les compatibilités depuis la fiche pièce.
                </p>
              ) : (
                <div className="grid gap-2">
                  {getCompatibleParts(partsOpen).map((part: any) => {
                    const present = installationParts.some(
                      (x: any) => x.installation_id === partsOpen.id && x.part_id === part.id,
                    );
                    return (
                      <label
                        key={part.id}
                        className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={present}
                          onChange={() => toggleInstallationPart(partsOpen.id, part.id, present)}
                        />
                        <span className="font-medium">{part.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {[part.reference, part.category].filter(Boolean).join(" · ")}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
