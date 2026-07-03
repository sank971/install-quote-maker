import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useList } from "@/lib/db-hooks";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ChevronLeft, Circle, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/quotes/new")({
  component: NewQuote,
});

interface Item {
  key: string;
  part_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
}

function NewQuote() {
  const navigate = useNavigate();
  const { data: clients = [] } = useList<any>("clients");
  const { data: sites = [] } = useList<any>("sites");
  const { data: installs = [] } = useList<any>("installations");
  const { data: parts = [] } = useList<any>("parts", { orderBy: "name", ascending: true });
  const { data: models = [] } = useList<any>("models");
  const { data: types = [] } = useList<any>("installation_types");
  const { data: modelCompat = [] } = useList<any>("part_model_compat");
  const { data: typeCompat = [] } = useList<any>("part_type_compat");
  const { data: installationParts = [] } = useList<any>("installation_parts");
  const { data: sp = [] } = useList<any>("supplier_parts");
  const { data: contracts = [] } = useList<any>("contracts");

  const [clientId, setClientId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [installationId, setInstallationId] = useState("");
  const [contractId, setContractId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [laborHours, setLaborHours] = useState(0);
  const [laborRate, setLaborRate] = useState(65);
  const [travelFee, setTravelFee] = useState(0);
  const [vatRate, setVatRate] = useState(20);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const clientSites = sites.filter((s: any) => s.client_id === clientId);
  const siteInstalls = installs.filter((i: any) => i.site_id === siteId);
  const installation = installs.find((i: any) => i.id === installationId);
  const contract = contracts.find((c: any) => c.id === contractId);
  const selectedClient = clients.find((c: any) => c.id === clientId);
  const selectedSite = sites.find((s: any) => s.id === siteId);

  // Apply contract rates
  const applyContract = (c: any) => {
    setContractId(c?.id ?? "");
    if (c?.hourly_rate != null) setLaborRate(Number(c.hourly_rate));
    if (c?.travel_fee != null) setTravelFee(Number(c.travel_fee));
  };

  const presentPartIds = useMemo(
    () =>
      new Set(
        installationParts
          .filter((x: any) => x.installation_id === installationId)
          .map((x: any) => x.part_id),
      ),
    [installationParts, installationId],
  );

  const normalizeName = (value: unknown) =>
    String(value ?? "")
      .trim()
      .toLowerCase();

  const compatibleParts = useMemo(() => {
    if (!installation?.model_id && !installation?.type_id) return parts;
    const ids = new Set<string>();
    const installationModel = models.find((m: any) => m.id === installation?.model_id);
    const effectiveTypeId = installation?.type_id || installationModel?.type_id;
    const installationType = types.find((t: any) => t.id === effectiveTypeId);
    const componentTypes = new Set(
      (installationType?.component_types ?? []).map((name: string) => normalizeName(name)),
    );

    if (installation.model_id) {
      modelCompat
        .filter((x: any) => x.model_id === installation.model_id)
        .forEach((x: any) => ids.add(x.part_id));
    }
    if (effectiveTypeId) {
      typeCompat
        .filter((x: any) => x.type_id === effectiveTypeId)
        .forEach((x: any) => ids.add(x.part_id));
    }
    installationParts
      .filter((x: any) => x.installation_id === installation.id)
      .forEach((x: any) => ids.add(x.part_id));

    return parts
      .filter(
        (p: any) => ids.has(p.id) || (p.category && componentTypes.has(normalizeName(p.category))),
      )
      .sort(
        (a: any, b: any) => Number(presentPartIds.has(b.id)) - Number(presentPartIds.has(a.id)),
      );
  }, [
    parts,
    models,
    types,
    modelCompat,
    typeCompat,
    installationParts,
    installation,
    presentPartIds,
  ]);

  const cheapestCost = (partId: string) => {
    const offers = sp.filter((x: any) => x.part_id === partId);
    if (offers.length === 0) return 0;
    return Math.min(...offers.map((o: any) => Number(o.purchase_price) + Number(o.shipping_cost)));
  };

  const addPart = (partId: string) => {
    const p = parts.find((x: any) => x.id === partId);
    if (!p) return;
    const discount = contract?.parts_discount_pct ? Number(contract.parts_discount_pct) / 100 : 0;
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        part_id: p.id,
        description: p.name,
        quantity: 1,
        unit_price: Number(p.sale_price) * (1 - discount),
        unit_cost: cheapestCost(p.id),
      },
    ]);
  };

  const addPresentParts = () => {
    const existingPartIds = new Set(items.map((item) => item.part_id).filter(Boolean));
    const ids = installationParts
      .filter((x: any) => x.installation_id === installationId)
      .map((x: any) => x.part_id)
      .filter((id: string) => !existingPartIds.has(id));

    ids.forEach(addPart);
    if (ids.length === 0) toast.info("Toutes les pièces présentes sont déjà ajoutées");
  };

  const addFree = () =>
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unit_price: 0,
        unit_cost: 0,
      },
    ]);

  const update = (key: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const remove = (key: string) => setItems((prev) => prev.filter((i) => i.key !== key));

  const partsHT = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const laborHT = laborHours * laborRate;
  const totalHT = partsHT + laborHT + travelFee;
  const vat = totalHT * (vatRate / 100);
  const totalTTC = totalHT + vat;
  const costsTotal = items.reduce((s, i) => s + i.unit_cost * i.quantity, 0);
  const margin = partsHT - costsTotal;
  const marginPct = partsHT > 0 ? (margin / partsHT) * 100 : 0;
  const hasBillableLine = items.length > 0 || laborHours > 0 || travelFee > 0;
  const workflowSteps = [
    { label: "Client", done: Boolean(clientId), hint: selectedClient?.name ?? "À choisir" },
    { label: "Site", done: Boolean(siteId), hint: selectedSite?.name ?? "Optionnel" },
    {
      label: "Installation",
      done: Boolean(installationId),
      hint: installation?.name ?? "Optionnel",
    },
    {
      label: "Chiffrage",
      done: hasBillableLine,
      hint: hasBillableLine ? `${totalHT.toFixed(2)} € HT` : "À compléter",
    },
  ];

  const save = async () => {
    if (!clientId) return toast.error("Sélectionnez un client");
    if (!hasBillableLine)
      return toast.error("Ajoutez une ligne, de la main-d’œuvre ou un déplacement");
    setBusy(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const owner_id = user.user!.id;
      const number = `DEV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const { data: quote, error } = await supabase
        .from("quotes")
        .insert({
          owner_id,
          quote_number: number,
          client_id: clientId,
          site_id: siteId || null,
          installation_id: installationId || null,
          contract_id: contractId || null,
          labor_hours: laborHours,
          labor_rate: laborRate,
          travel_fee: travelFee,
          vat_rate: vatRate,
          notes: notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      if (items.length > 0) {
        const rows = items.map((i, idx) => ({
          owner_id,
          quote_id: quote.id,
          part_id: i.part_id ?? null,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          unit_cost: i.unit_cost,
          position: idx,
        }));
        const { error: e2 } = await supabase.from("quote_items").insert(rows);
        if (e2) throw e2;
      }
      toast.success("Devis créé");
      navigate({ to: "/quotes/$quoteId", params: { quoteId: quote.id } });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Link
        to="/quotes"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Devis
      </Link>
      <PageHeader
        title="Nouveau devis"
        description="Suivez le workflow : client → site → installation → pièces"
      />

      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-4">
          {workflowSteps.map((step, index) => {
            const Icon = step.done ? CheckCircle2 : Circle;
            return (
              <div key={step.label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-sm font-semibold shadow-sm">
                  {step.done ? (
                    <Icon className="h-4 w-4 text-success" />
                  ) : (
                    <span className="text-muted-foreground">{index + 1}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{step.label}</div>
                  <div className="truncate text-xs text-muted-foreground">{step.hint}</div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Contexte</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Client *</Label>
                <select
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    setSiteId("");
                    setInstallationId("");
                  }}
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
                <Label>Site</Label>
                <select
                  value={siteId}
                  onChange={(e) => {
                    setSiteId(e.target.value);
                    setInstallationId("");
                  }}
                  disabled={!clientId}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">—</option>
                  {clientSites.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Installation</Label>
                <select
                  value={installationId}
                  onChange={(e) => {
                    setInstallationId(e.target.value);
                    const inst = installs.find((x: any) => x.id === e.target.value);
                    if (inst?.contract_id)
                      applyContract(contracts.find((c: any) => c.id === inst.contract_id));
                  }}
                  disabled={!siteId}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">—</option>
                  {siteInstalls.map((i: any) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Contrat appliqué</Label>
                <select
                  value={contractId}
                  onChange={(e) =>
                    applyContract(contracts.find((c: any) => c.id === e.target.value))
                  }
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                2. Pièces{" "}
                {installation && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (présentes puis compatibles)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addPart(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="flex h-9 flex-1 min-w-[200px] rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">+ Ajouter une pièce présente / compatible</option>
                  {compatibleParts.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {presentPartIds.has(p.id) ? "✓ " : ""}
                      {p.name} — {Number(p.sale_price).toFixed(2)}€
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addPresentParts}
                  disabled={!installationId || presentPartIds.size === 0}
                >
                  Ajouter présentes
                </Button>
                <Button variant="outline" size="sm" onClick={addFree}>
                  <Plus className="mr-1 h-4 w-4" />
                  Ligne libre
                </Button>
              </div>

              {items.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Commencez par sélectionner une installation pour filtrer les pièces compatibles,
                  ajoutez toutes les pièces présentes en un clic, ou créez une ligne libre.
                </div>
              )}
              {items.map((i) => (
                <div
                  key={i.key}
                  className="grid gap-2 rounded-md border border-border/60 p-3 sm:grid-cols-[1fr_80px_100px_100px_40px] sm:items-center"
                >
                  <Input
                    value={i.description}
                    onChange={(e) => update(i.key, { description: e.target.value })}
                    placeholder="Description"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={i.quantity}
                    onChange={(e) => update(i.key, { quantity: Number(e.target.value) })}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={i.unit_price}
                    onChange={(e) => update(i.key, { unit_price: Number(e.target.value) })}
                    placeholder="PU HT"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={i.unit_cost}
                    onChange={(e) => update(i.key, { unit_cost: Number(e.target.value) })}
                    placeholder="Coût"
                    title="Coût réel"
                  />
                  <Button variant="ghost" size="icon" onClick={() => remove(i.key)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. Main-d'œuvre & déplacement</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-4">
              <div>
                <Label>Heures</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={laborHours}
                  onChange={(e) => setLaborHours(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Tarif €/h</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={laborRate}
                  onChange={(e) => setLaborRate(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Déplacement €</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={travelFee}
                  onChange={(e) => setTravelFee(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>TVA %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value))}
                />
              </div>
              <div className="sm:col-span-4">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-base">Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <Row label="Pièces HT" value={partsHT} />
              <Row label="Main-d'œuvre" value={laborHT} />
              <Row label="Déplacement" value={travelFee} />
              <div className="my-2 border-t border-border/60" />
              <Row label="Total HT" value={totalHT} strong />
              <Row label={`TVA ${vatRate}%`} value={vat} />
              <Row label="Total TTC" value={totalTTC} strong />
              <div className="my-2 border-t border-border/60" />
              <div className="rounded-md bg-muted/60 p-2">
                <Row label="Coût pièces" value={costsTotal} muted />
                <Row label="Marge" value={margin} muted />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>% de marge</span>
                  <span
                    className={
                      marginPct >= 30
                        ? "text-success"
                        : marginPct >= 15
                          ? "text-warning"
                          : "text-destructive"
                    }
                  >
                    {marginPct.toFixed(1)}%
                  </span>
                </div>
              </div>
              {!clientId && (
                <p className="pt-2 text-xs text-muted-foreground">
                  Sélectionnez au minimum un client pour créer le devis.
                </p>
              )}
              {clientId && !hasBillableLine && (
                <p className="pt-2 text-xs text-muted-foreground">
                  Ajoutez une ligne, de la main-d’œuvre ou un déplacement pour finaliser.
                </p>
              )}
              <Button
                onClick={save}
                disabled={busy || !clientId || !hasBillableLine}
                className="mt-3 w-full"
              >
                {busy ? "Enregistrement..." : "Créer le devis"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: number;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${strong ? "font-semibold" : ""} ${muted ? "text-xs text-muted-foreground" : ""}`}
    >
      <span>{label}</span>
      <span>{value.toFixed(2)} €</span>
    </div>
  );
}
