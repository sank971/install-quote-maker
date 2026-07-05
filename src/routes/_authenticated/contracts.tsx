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
import { Plus, ScrollText, Pencil, Trash2, Euro, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
  const { data: parts = [] } = useList<any>("parts", { orderBy: "name", ascending: true });
  const { data: types = [] } = useList<any>("installation_types", {
    orderBy: "name",
    ascending: true,
  });
  const { data: kitPrices = [] } = useList<any>("contract_kit_prices");
  const { data: pricingTiers = [] } = useList<any>("contract_pricing_tiers");
  const { data: clientPricing = [] } = useList<any>("contract_client_pricing");
  const upsert = useUpsert("contracts");
  const remove = useRemove("contracts");
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

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
    const saved = await upsert.mutateAsync({
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
      oversized_shipping_fee: asNumberOrNull(fd.get("oversized_shipping_fee")),
      dump_evacuation_fee: asNumberOrNull(fd.get("dump_evacuation_fee")),
      lifting_equipment_fee: asNumberOrNull(fd.get("lifting_equipment_fee")),
      notes: fd.get("notes") || null,
    });

    const kitRows = parts
      .filter((part: any) => part.is_kit)
      .map((kit: any) => ({
        kit_part_id: kit.id,
        negotiated_price: fd.get(`kit_price_${kit.id}`),
        notes: fd.get(`kit_notes_${kit.id}`),
      }))
      .filter((row: any) => row.negotiated_price !== null && row.negotiated_price !== "");

    const { data: userData } = await supabase.auth.getUser();
    const owner_id = userData.user!.id;
    const { error: deleteError } = await (supabase.from("contract_kit_prices" as any) as any)
      .delete()
      .eq("contract_id", saved.id);
    if (deleteError) return toast.error(deleteError.message);

    if (kitRows.length > 0) {
      const { error: insertError } = await (
        supabase.from("contract_kit_prices" as any) as any
      ).insert(
        kitRows.map((row: any) => ({
          owner_id,
          contract_id: saved.id,
          kit_part_id: row.kit_part_id,
          negotiated_price: Number(row.negotiated_price),
          notes: row.notes || null,
        })),
      );
      if (insertError) return toast.error(insertError.message);
    }

    const pricingRows = types
      .map((type: any) => ({
        installation_type_id: type.id,
        base_annual_price: fd.get(`type_price_${type.id}`),
        min_installations: fd.get(`type_min_${type.id}`),
      }))
      .filter((row: any) => row.base_annual_price !== null && row.base_annual_price !== "");

    const { error: deletePricingError } = await (
      supabase.from("contract_pricing_tiers" as any) as any
    )
      .delete()
      .eq("contract_id", saved.id);
    if (deletePricingError) return toast.error(deletePricingError.message);

    if (pricingRows.length > 0) {
      const { error: insertPricingError } = await (
        supabase.from("contract_pricing_tiers" as any) as any
      ).insert(
        pricingRows.map((row: any) => ({
          owner_id,
          contract_id: saved.id,
          installation_type_id: row.installation_type_id,
          base_annual_price: Number(row.base_annual_price),
          min_installations: row.min_installations ? Number(row.min_installations) : 1,
        })),
      );
      if (insertPricingError) return toast.error(insertPricingError.message);
    }

    const clientRows = clients
      .map((client: any) => ({
        client_id: client.id,
        adjustment_pct: fd.get(`client_adjustment_${client.id}`),
        notes: fd.get(`client_notes_${client.id}`),
      }))
      .filter(
        (row: any) =>
          (row.adjustment_pct !== null && row.adjustment_pct !== "") ||
          (row.notes !== null && row.notes !== ""),
      );

    const { error: deleteClientPricingError } = await (
      supabase.from("contract_client_pricing" as any) as any
    )
      .delete()
      .eq("contract_id", saved.id);
    if (deleteClientPricingError) return toast.error(deleteClientPricingError.message);

    if (clientRows.length > 0) {
      const { error: insertClientPricingError } = await (
        supabase.from("contract_client_pricing" as any) as any
      ).insert(
        clientRows.map((row: any) => ({
          owner_id,
          contract_id: saved.id,
          client_id: row.client_id,
          adjustment_pct: row.adjustment_pct === "" ? 0 : Number(row.adjustment_pct),
          notes: row.notes || null,
        })),
      );
      if (insertClientPricingError) return toast.error(insertClientPricingError.message);
    }

    qc.invalidateQueries({ queryKey: ["contract_kit_prices"] });
    qc.invalidateQueries({ queryKey: ["contract_pricing_tiers"] });
    qc.invalidateQueries({ queryKey: ["contract_client_pricing"] });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Contrats"
        description="Tarifs négociés par client ou installation"
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau contrat
          </Button>
        }
      />

      {contracts.length === 0 ? (
        <EmptyState
          title="Aucun contrat"
          action={
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {contracts.map((c: any) => {
            const client = clients.find((x: any) => x.id === c.client_id);
            const contractTiers = pricingTiers.filter((row: any) => row.contract_id === c.id);
            const contractClientPricing = clientPricing.filter(
              (row: any) => row.contract_id === c.id,
            );
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <ScrollText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {TYPES.find((t) => t.value === c.type)?.label ?? c.type}
                        {client && ` · ${client.name}`}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {c.hourly_rate && `${c.hourly_rate}€/h · `}
                        {c.travel_fee != null && `Dépl. ${c.travel_fee}€ · `}
                        {Number(c.parts_discount_pct) > 0 &&
                          `Remise pièces ${c.parts_discount_pct}%`}
                        {c.repairs_included && " · Réparations hors casse incluses"}
                        {c.on_call_included && " · Astreinte incluse"}
                      </div>
                      {contractTiers.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {contractTiers.map((tier: any) => {
                            const type = types.find((t: any) => t.id === tier.installation_type_id);
                            return (
                              <span
                                key={tier.id}
                                className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs"
                              >
                                <Wrench className="h-3 w-3" />
                                {type?.name ?? "Type supprimé"} :{" "}
                                {Number(tier.base_annual_price).toFixed(2)}
                                €/an
                                {Number(tier.min_installations ?? 1) > 1 &&
                                  ` dès ${tier.min_installations} installations`}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {contractClientPricing.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {contractClientPricing.map((row: any) => {
                            const pricedClient = clients.find((x: any) => x.id === row.client_id);
                            return (
                              <span
                                key={row.id}
                                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                              >
                                <Euro className="h-3 w-3" />
                                {pricedClient?.name ?? "Client supprimé"} :{" "}
                                {Number(row.adjustment_pct)}%
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Supprimer ?")) remove.mutate(c.id);
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Modifier" : "Nouveau"} contrat</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Nom *</Label>
              <Input name="name" required defaultValue={edit?.name} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Type</Label>
                <select
                  name="type"
                  defaultValue={edit?.type ?? "generic"}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Client</Label>
                <select
                  name="client_id"
                  defaultValue={edit?.client_id ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">—</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Tarif horaire (€)</Label>
                <Input
                  name="hourly_rate"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.hourly_rate ?? ""}
                />
              </div>
              <div>
                <Label>Déplacement (€)</Label>
                <Input
                  name="travel_fee"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.travel_fee ?? ""}
                />
              </div>
              <div>
                <Label>Forfait (€)</Label>
                <Input
                  name="flat_fee"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.flat_fee ?? ""}
                />
              </div>
              <div>
                <Label>Remise pièces (%)</Label>
                <Input
                  name="parts_discount_pct"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.parts_discount_pct ?? 0}
                />
              </div>
            </div>
            <div className="rounded-md border border-border/60 p-3">
              <div className="mb-3 text-sm font-medium">Options comprises au contrat</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    name="on_call_included"
                    type="checkbox"
                    defaultChecked={Boolean(edit?.on_call_included)}
                  />
                  Astreinte comprise
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    name="repairs_included"
                    type="checkbox"
                    defaultChecked={Boolean(edit?.repairs_included)}
                  />
                  Réparations hors casse comprises
                </label>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Tarif astreinte €/h</Label>
                <Input
                  name="on_call_hourly_rate"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.on_call_hourly_rate ?? ""}
                />
              </div>
              <div>
                <Label>Déplacement astreinte (€)</Label>
                <Input
                  name="on_call_travel_fee"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.on_call_travel_fee ?? ""}
                />
              </div>
              <div>
                <Label>Frais de port (€)</Label>
                <Input
                  name="shipping_fee"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.shipping_fee ?? ""}
                />
              </div>
              <div>
                <Label>Traitement déchets (€)</Label>
                <Input
                  name="waste_treatment_fee"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.waste_treatment_fee ?? ""}
                />
              </div>
              <div>
                <Label>Frais de port hors gabarit (€)</Label>
                <Input
                  name="oversized_shipping_fee"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.oversized_shipping_fee ?? ""}
                />
              </div>
              <div>
                <Label>Évacuation déchetterie (€)</Label>
                <Input
                  name="dump_evacuation_fee"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.dump_evacuation_fee ?? ""}
                />
              </div>
              <div>
                <Label>Engin de levage (€)</Label>
                <Input
                  name="lifting_equipment_fee"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.lifting_equipment_fee ?? ""}
                />
              </div>
            </div>
            {types.length > 0 && (
              <div className="rounded-md border border-border/60 p-3">
                <div className="mb-1 text-sm font-medium">Tarifs par type d'installation</div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Saisissez le prix annuel négocié pour chaque catégorie d'installation couverte par
                  le contrat.
                </p>
                <div className="space-y-3">
                  {types.map((type: any) => {
                    const tier = pricingTiers.find(
                      (row: any) =>
                        row.contract_id === edit?.id && row.installation_type_id === type.id,
                    );
                    return (
                      <div
                        key={type.id}
                        className="grid gap-2 sm:grid-cols-[1fr_150px_150px] sm:items-center"
                      >
                        <div className="text-sm">
                          <div className="font-medium">{type.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {type.description || "Tarif de base à appliquer aux devis de contrat"}
                          </div>
                        </div>
                        <Input
                          name={`type_price_${type.id}`}
                          type="number"
                          step="0.01"
                          placeholder="€/an"
                          defaultValue={tier?.base_annual_price ?? ""}
                        />
                        <Input
                          name={`type_min_${type.id}`}
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Min. installations"
                          defaultValue={tier?.min_installations ?? ""}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {clients.length > 0 && (
              <div className="rounded-md border border-border/60 p-3">
                <div className="mb-1 text-sm font-medium">Ajustements par client</div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Ajoutez une remise ou majoration spécifique en complément des tarifs par
                  installation. Utilisez une valeur négative pour une remise.
                </p>
                <div className="space-y-3">
                  {clients.map((client: any) => {
                    const row = clientPricing.find(
                      (pricing: any) =>
                        pricing.contract_id === edit?.id && pricing.client_id === client.id,
                    );
                    return (
                      <div
                        key={client.id}
                        className="grid gap-2 sm:grid-cols-[1fr_130px_1fr] sm:items-center"
                      >
                        <div className="text-sm font-medium">{client.name}</div>
                        <Input
                          name={`client_adjustment_${client.id}`}
                          type="number"
                          step="0.01"
                          placeholder="%"
                          defaultValue={row?.adjustment_pct ?? ""}
                        />
                        <Input
                          name={`client_notes_${client.id}`}
                          placeholder="Note"
                          defaultValue={row?.notes ?? ""}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {parts.some((part: any) => part.is_kit) && (
              <div className="rounded-md border border-border/60 p-3">
                <div className="mb-3 text-sm font-medium">Tarifs négociés des kits</div>
                <div className="space-y-3">
                  {parts
                    .filter((part: any) => part.is_kit)
                    .map((kit: any) => {
                      const price = kitPrices.find(
                        (row: any) => row.contract_id === edit?.id && row.kit_part_id === kit.id,
                      );
                      return (
                        <div
                          key={kit.id}
                          className="grid gap-2 sm:grid-cols-[1fr_140px_1fr] sm:items-center"
                        >
                          <div className="text-sm">
                            <div className="font-medium">{kit.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Prix catalogue {Number(kit.sale_price ?? 0).toFixed(2)} €
                            </div>
                          </div>
                          <Input
                            name={`kit_price_${kit.id}`}
                            type="number"
                            step="0.01"
                            placeholder="Prix lot €"
                            defaultValue={price?.negotiated_price ?? ""}
                          />
                          <Input
                            name={`kit_notes_${kit.id}`}
                            placeholder="Note"
                            defaultValue={price?.notes ?? ""}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
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
