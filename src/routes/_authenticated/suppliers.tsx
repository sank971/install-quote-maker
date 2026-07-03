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
import { Plus, Truck, Pencil, Trash2, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/suppliers")({
  component: SuppliersPage,
});

function SuppliersPage() {
  const { data: suppliers = [] } = useList<any>("suppliers", { orderBy: "name", ascending: true });
  const { data: parts = [] } = useList<any>("parts", { orderBy: "name", ascending: true });
  const { data: sp = [] } = useList<any>("supplier_parts");
  const upsertS = useUpsert("suppliers");
  const removeS = useRemove("suppliers");
  const upsertSP = useUpsert("supplier_parts");
  const removeSP = useRemove("supplier_parts");

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [pricingFor, setPricingFor] = useState<any>(null);
  const [priceEdit, setPriceEdit] = useState<any>(null);

  const openNew = () => {
    setEdit({});
    setOpen(true);
  };
  const openEdit = (s: any) => {
    setEdit(s);
    setOpen(true);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await upsertS.mutateAsync({
      id: edit.id,
      name: fd.get("name"),
      email: fd.get("email") || null,
      phone: fd.get("phone") || null,
      payment_terms: fd.get("payment_terms") || null,
      iban: fd.get("iban") || null,
      bic: fd.get("bic") || null,
      account_holder: fd.get("account_holder") || null,
      notes: fd.get("notes") || null,
    });
    setOpen(false);
  };

  const submitPrice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const partId = fd.get("part_id") as string;
    const existing = sp.find((x: any) => x.supplier_id === pricingFor.id && x.part_id === partId);
    await upsertSP.mutateAsync({
      id: existing?.id,
      supplier_id: pricingFor.id,
      part_id: partId,
      supplier_ref: fd.get("supplier_ref") || null,
      purchase_price: Number(fd.get("purchase_price") ?? 0),
      shipping_cost: Number(fd.get("shipping_cost") ?? 0),
      lead_time_days: fd.get("lead_time_days") ? Number(fd.get("lead_time_days")) : null,
      price_updated_at: new Date().toISOString(),
    });
    (e.currentTarget as HTMLFormElement).reset();
    setPriceEdit(null);
  };

  return (
    <div>
      <PageHeader
        title="Fournisseurs"
        description="Prix d'achat et meilleurs fournisseurs"
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau fournisseur
          </Button>
        }
      />

      {suppliers.length === 0 ? (
        <EmptyState
          title="Aucun fournisseur"
          action={
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {suppliers.map((s: any) => {
            const partsCount = sp.filter((x: any) => x.supplier_id === s.id).length;
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[s.email, s.phone, s.payment_terms].filter(Boolean).join(" · ") || "—"}
                      </div>
                      {(s.account_holder || s.iban || s.bic) && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Paiement : {[s.account_holder, s.iban, s.bic].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {partsCount} pièces référencées
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setPricingFor(s)}>
                      <DollarSign className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Supprimer ?")) removeS.mutate(s.id);
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
            <DialogTitle>{edit?.id ? "Modifier" : "Nouveau"} fournisseur</DialogTitle>
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
            <div className="space-y-3 rounded-md border border-border/60 p-3">
              <div className="text-sm font-medium">Informations de paiement</div>
              <div>
                <Label>Conditions de paiement</Label>
                <Input
                  name="payment_terms"
                  placeholder="Ex. Virement à 30 jours"
                  defaultValue={edit?.payment_terms}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Titulaire du compte</Label>
                  <Input name="account_holder" defaultValue={edit?.account_holder} />
                </div>
                <div>
                  <Label>BIC</Label>
                  <Input name="bic" defaultValue={edit?.bic} />
                </div>
              </div>
              <div>
                <Label>IBAN</Label>
                <Input name="iban" defaultValue={edit?.iban} />
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

      <Dialog
        open={!!pricingFor}
        onOpenChange={(o) => {
          if (!o) {
            setPricingFor(null);
            setPriceEdit(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tarifs pièces — {pricingFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {sp
              .filter((x: any) => x.supplier_id === pricingFor?.id)
              .map((x: any) => {
                const part = parts.find((p: any) => p.id === x.part_id);
                return (
                  <div
                    key={x.id}
                    className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-medium">{part?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Ref {x.supplier_ref || "—"} · {x.lead_time_days ?? "?"}j · MAJ{" "}
                        {new Date(x.price_updated_at).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>
                        {Number(x.purchase_price).toFixed(2)} €{" "}
                        <span className="text-muted-foreground text-xs">
                          (+{Number(x.shipping_cost).toFixed(2)} port)
                        </span>
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => setPriceEdit(x)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeSP.mutate(x.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>

          <form
            onSubmit={submitPrice}
            className="mt-4 space-y-3 rounded-md border border-border/60 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">
                {priceEdit ? "Modifier le tarif" : "Ajouter / mettre à jour un tarif"}
              </div>
              {priceEdit && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPriceEdit(null)}>
                  Annuler la modification
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Pièce</Label>
                <select
                  name="part_id"
                  required
                  value={priceEdit?.part_id ?? ""}
                  onChange={(e) => {
                    const existing = sp.find(
                      (x: any) => x.supplier_id === pricingFor?.id && x.part_id === e.target.value,
                    );
                    setPriceEdit(existing ?? { part_id: e.target.value });
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">—</option>
                  {parts.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Réf. fournisseur</Label>
                <Input
                  name="supplier_ref"
                  value={priceEdit?.supplier_ref ?? ""}
                  onChange={(e) =>
                    setPriceEdit({ ...(priceEdit ?? {}), supplier_ref: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Prix achat (€)</Label>
                <Input
                  name="purchase_price"
                  type="number"
                  step="0.01"
                  required
                  value={priceEdit?.purchase_price ?? ""}
                  onChange={(e) =>
                    setPriceEdit({ ...(priceEdit ?? {}), purchase_price: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Frais de port (€)</Label>
                <Input
                  name="shipping_cost"
                  type="number"
                  step="0.01"
                  value={priceEdit?.shipping_cost ?? 0}
                  onChange={(e) =>
                    setPriceEdit({ ...(priceEdit ?? {}), shipping_cost: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Délai (jours)</Label>
                <Input
                  name="lead_time_days"
                  type="number"
                  value={priceEdit?.lead_time_days ?? ""}
                  onChange={(e) =>
                    setPriceEdit({ ...(priceEdit ?? {}), lead_time_days: e.target.value })
                  }
                />
              </div>
            </div>
            <Button type="submit" size="sm">
              Enregistrer le tarif
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
