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
import { Plus, ScrollText, Pencil, Trash2 } from "lucide-react";

const asNumberOrNull = (value: FormDataEntryValue | null) =>
  value === null || value === "" ? null : Number(value);

const TYPES = [
  { value: "generic", label: "Contrat générique" },
  { value: "framework", label: "Contrat cadre" },
  { value: "maintenance", label: "Maintenance" },
  { value: "warranty", label: "Garantie" },
];

export const Route = createFileRoute("/_authenticated/contracts")({
  component: ContractsPage,
});

function ContractsPage() {
  const { data: contracts = [] } = useList<any>("contracts", { orderBy: "name", ascending: true });
  const { data: clients = [] } = useList<any>("clients");
  const upsert = useUpsert("contracts");
  const remove = useRemove("contracts");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const openNew = () => { setEdit({}); setOpen(true); };
  const openEdit = (c: any) => { setEdit(c); setOpen(true); };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await upsert.mutateAsync({
      id: edit.id,
      name: fd.get("name"),
      type: fd.get("type"),
      client_id: fd.get("client_id") || null,
      hourly_rate: fd.get("hourly_rate") ? Number(fd.get("hourly_rate")) : null,
      travel_fee: fd.get("travel_fee") ? Number(fd.get("travel_fee")) : null,
      flat_fee: asNumberOrNull(fd.get("flat_fee")),
      parts_discount_pct: Number(fd.get("parts_discount_pct") ?? 0),
      on_call_included: fd.get("on_call_included") === "on",
      repairs_included: fd.get("repairs_included") === "on",
      on_call_hourly_rate: asNumberOrNull(fd.get("on_call_hourly_rate")),
      on_call_travel_fee: asNumberOrNull(fd.get("on_call_travel_fee")),
      shipping_fee: asNumberOrNull(fd.get("shipping_fee")),
      waste_treatment_fee: asNumberOrNull(fd.get("waste_treatment_fee")),
      lifting_equipment_fee: asNumberOrNull(fd.get("lifting_equipment_fee")),
      notes: fd.get("notes") || null,
    });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Contrats"
        description="Tarifs négociés par client ou installation"
        actions={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouveau contrat</Button>}
      />

      {contracts.length === 0 ? (
        <EmptyState title="Aucun contrat" action={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Ajouter</Button>} />
      ) : (
        <div className="grid gap-3">
          {contracts.map((c: any) => {
            const client = clients.find((x: any) => x.id === c.client_id);
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary"><ScrollText className="h-4 w-4" /></div>
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {TYPES.find(t => t.value === c.type)?.label ?? c.type}
                        {client && ` · ${client.name}`}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {c.hourly_rate && `${c.hourly_rate}€/h · `}
                        {c.travel_fee != null && `Dépl. ${c.travel_fee}€ · `}
                        {Number(c.parts_discount_pct) > 0 && `Remise pièces ${c.parts_discount_pct}%`}
                        {c.repairs_included && " · Réparations hors casse incluses"}
                        {c.on_call_included && " · Astreinte incluse"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Supprimer ?")) remove.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Modifier" : "Nouveau"} contrat</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Nom *</Label><Input name="name" required defaultValue={edit?.name} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Type</Label>
                <select name="type" defaultValue={edit?.type ?? "generic"} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Client</Label>
                <select name="client_id" defaultValue={edit?.client_id ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                  <option value="">—</option>
                  {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><Label>Tarif horaire (€)</Label><Input name="hourly_rate" type="number" step="0.01" defaultValue={edit?.hourly_rate ?? ""} /></div>
              <div><Label>Déplacement (€)</Label><Input name="travel_fee" type="number" step="0.01" defaultValue={edit?.travel_fee ?? ""} /></div>
              <div><Label>Forfait (€)</Label><Input name="flat_fee" type="number" step="0.01" defaultValue={edit?.flat_fee ?? ""} /></div>
              <div><Label>Remise pièces (%)</Label><Input name="parts_discount_pct" type="number" step="0.01" defaultValue={edit?.parts_discount_pct ?? 0} /></div>
            </div>
            <div className="rounded-md border border-border/60 p-3">
              <div className="mb-3 text-sm font-medium">Options comprises au contrat</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input name="on_call_included" type="checkbox" defaultChecked={Boolean(edit?.on_call_included)} />
                  Astreinte comprise
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input name="repairs_included" type="checkbox" defaultChecked={Boolean(edit?.repairs_included)} />
                  Réparations hors casse comprises
                </label>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Tarif astreinte €/h</Label><Input name="on_call_hourly_rate" type="number" step="0.01" defaultValue={edit?.on_call_hourly_rate ?? ""} /></div>
              <div><Label>Déplacement astreinte (€)</Label><Input name="on_call_travel_fee" type="number" step="0.01" defaultValue={edit?.on_call_travel_fee ?? ""} /></div>
              <div><Label>Frais de port (€)</Label><Input name="shipping_fee" type="number" step="0.01" defaultValue={edit?.shipping_fee ?? ""} /></div>
              <div><Label>Traitement déchets (€)</Label><Input name="waste_treatment_fee" type="number" step="0.01" defaultValue={edit?.waste_treatment_fee ?? ""} /></div>
              <div><Label>Engin de levage (€)</Label><Input name="lifting_equipment_fee" type="number" step="0.01" defaultValue={edit?.lifting_equipment_fee ?? ""} /></div>
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
