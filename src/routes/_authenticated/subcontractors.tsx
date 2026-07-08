/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  MapPinned,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Calculator,
  Download,
  Upload,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useList, useRemove, useUpsert } from "@/lib/db-hooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { downloadCsv, importCsvFile, pick } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/subcontractors")({
  component: SubcontractorsPage,
});

type Point = { lat: number; lng: number };
const bounds = { minLat: 41, maxLat: 51.5, minLng: -5.5, maxLng: 9.8 };
const toPct = (p: Point) => ({
  x: ((p.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100,
  y: ((bounds.maxLat - p.lat) / (bounds.maxLat - bounds.minLat)) * 100,
});
const fromPct = (x: number, y: number) => ({
  lng: bounds.minLng + (x / 100) * (bounds.maxLng - bounds.minLng),
  lat: bounds.maxLat - (y / 100) * (bounds.maxLat - bounds.minLat),
});
const km = (a: Point, b: Point) => {
  const r = 6371,
    dLat = ((b.lat - a.lat) * Math.PI) / 180,
    dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180,
    la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
};

function SubcontractorsPage() {
  const qc = useQueryClient();
  const { data: subcontractors = [] } = useList<any>("subcontractors", {
    orderBy: "name",
    ascending: true,
  });
  const { data: links = [] } = useList<any>("subcontractor_installation_types");
  const { data: types = [] } = useList<any>("installation_types", {
    orderBy: "name",
    ascending: true,
  });
  const { data: sites = [] } = useList<any>("sites", { orderBy: "name", ascending: true });
  const upsert = useUpsert("subcontractors", [
    ["subcontractors"],
    ["subcontractor_installation_types"],
  ]);
  const remove = useRemove("subcontractors");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [zone, setZone] = useState<Point[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [selectedSub, setSelectedSub] = useState("");

  const geolocatedSites = sites.filter((s: any) => s.latitude && s.longitude);
  const selectedCost = useMemo(() => {
    const site = sites.find((s: any) => s.id === selectedSite);
    const sub = subcontractors.find((s: any) => s.id === selectedSub);
    if (!site?.latitude || !site?.longitude || !sub?.latitude || !sub?.longitude) return null;
    const distance = km(
      { lat: Number(sub.latitude), lng: Number(sub.longitude) },
      { lat: Number(site.latitude), lng: Number(site.longitude) },
    );
    const billable = Math.max(0, distance - Number(sub.included_km || 0));
    return { distance, billable, extra: billable * Number(sub.extra_km_rate || 0) };
  }, [selectedSite, selectedSub, sites, subcontractors]);

  const exportSubcontractors = () =>
    downloadCsv(
      "sous_traitants.csv",
      subcontractors.map((s: any) => ({
        nom: s.name,
        type: s.kind,
        email: s.email,
        telephone: s.phone,
        adresse: s.address,
        latitude: s.latitude,
        longitude: s.longitude,
        taux_horaire: s.hourly_rate,
        deplacement: s.travel_rate,
        demi_journee: s.half_day_rate,
        journee: s.day_rate,
        km_inclus: s.included_km,
        tarif_km_sup: s.extra_km_rate,
        notes: s.notes,
      })),
      [
        "nom",
        "type",
        "email",
        "telephone",
        "adresse",
        "latitude",
        "longitude",
        "taux_horaire",
        "deplacement",
        "demi_journee",
        "journee",
        "km_inclus",
        "tarif_km_sup",
        "notes",
      ],
    );

  const importSubcontractors = () =>
    importCsvFile(async (rows) => {
      const { data } = await supabase.auth.getUser();
      const owner_id = data.user?.id;
      if (!owner_id) return toast.error("Non authentifié");
      for (const row of rows) {
        const name = pick(row, "nom", "name");
        if (!name) continue;
        const payload = {
          owner_id,
          name,
          kind: pick(row, "type", "kind") || "sst",
          email: pick(row, "email") || null,
          phone: pick(row, "telephone", "phone") || null,
          address: pick(row, "adresse", "address") || null,
          latitude: pick(row, "latitude") ? Number(pick(row, "latitude")) : null,
          longitude: pick(row, "longitude") ? Number(pick(row, "longitude")) : null,
          hourly_rate: Number(pick(row, "taux_horaire", "hourly_rate") || 0),
          travel_rate: Number(pick(row, "deplacement", "travel_rate") || 0),
          half_day_rate: Number(pick(row, "demi_journee", "half_day_rate") || 0),
          day_rate: Number(pick(row, "journee", "day_rate") || 0),
          included_km: Number(pick(row, "km_inclus", "included_km") || 0),
          extra_km_rate: Number(pick(row, "tarif_km_sup", "extra_km_rate") || 0),
          notes: pick(row, "notes") || null,
        };
        const existing = subcontractors.find(
          (s: any) => s.name.toLowerCase() === name.toLowerCase(),
        );
        if (existing)
          await (supabase.from("subcontractors") as any).update(payload).eq("id", existing.id);
        else await (supabase.from("subcontractors") as any).insert(payload);
      }
      qc.invalidateQueries({ queryKey: ["subcontractors"] });
      toast.success("Sous-traitants importés");
    });

  const openEditor = (s?: any) => {
    setEdit(s ?? {});
    setZone(Array.isArray(s?.intervention_zone) ? s.intervention_zone : []);
    setOpen(true);
  };
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const saved = await upsert.mutateAsync({
      id: edit.id,
      name: fd.get("name"),
      kind: fd.get("kind") || "sst",
      email: fd.get("email") || null,
      phone: fd.get("phone") || null,
      address: fd.get("address") || null,
      latitude: fd.get("latitude") ? Number(fd.get("latitude")) : null,
      longitude: fd.get("longitude") ? Number(fd.get("longitude")) : null,
      payment_terms: fd.get("payment_terms") || null,
      account_holder: fd.get("account_holder") || null,
      iban: fd.get("iban") || null,
      bic: fd.get("bic") || null,
      hourly_rate: Number(fd.get("hourly_rate") || 0),
      travel_rate: Number(fd.get("travel_rate") || 0),
      half_day_rate: Number(fd.get("half_day_rate") || 0),
      day_rate: Number(fd.get("day_rate") || 0),
      included_km: Number(fd.get("included_km") || 0),
      extra_km_rate: Number(fd.get("extra_km_rate") || 0),
      intervention_zone: zone,
      notes: fd.get("notes") || null,
    });
    const { data } = await supabase.auth.getUser();
    const owner_id = data.user?.id;
    await (supabase.from("subcontractor_installation_types") as any)
      .delete()
      .eq("subcontractor_id", saved.id);
    const selected = fd.getAll("installation_type_id");
    if (owner_id && selected.length)
      await (supabase.from("subcontractor_installation_types") as any).insert(
        selected.map((installation_type_id) => ({
          owner_id,
          subcontractor_id: saved.id,
          installation_type_id,
        })),
      );
    toast.success("Compétences mises à jour");
    setOpen(false);
  };

  const addZonePoint = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZone([
      ...zone,
      fromPct(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100),
    ]);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sous-traitants & carte"
        description="Techniciens, SST, sites, zones d’intervention et frais kilométriques à vol d’oiseau."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportSubcontractors}>
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
            <Button variant="outline" onClick={importSubcontractors}>
              <Upload className="mr-2 h-4 w-4" />
              Importer CSV
            </Button>
            <Button onClick={() => openEditor()}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau SST / technicien
            </Button>
          </div>
        }
      />
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 font-medium">
          <Calculator className="h-4 w-4" />
          Simulation frais km
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={selectedSub}
            onChange={(e) => setSelectedSub(e.target.value)}
          >
            <option value="">Sous-traitant / technicien</option>
            {subcontractors.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
          >
            <option value="">Site</option>
            {geolocatedSites.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="text-sm text-muted-foreground">
            {selectedCost
              ? `${selectedCost.distance.toFixed(0)} km · ${selectedCost.billable.toFixed(0)} km facturables · ${selectedCost.extra.toFixed(2)} € sup.`
              : "Sélectionnez deux points géolocalisés."}
          </div>
        </div>
      </Card>
      <FranceMap sites={geolocatedSites} subcontractors={subcontractors} />
      {subcontractors.length === 0 ? (
        <EmptyState
          title="Aucun sous-traitant"
          description="Créez votre premier SST ou technicien."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {subcontractors.map((s: any) => {
            const st = links
              .filter((l: any) => l.subcontractor_id === s.id)
              .map((l: any) => types.find((t: any) => t.id === l.installation_type_id)?.name)
              .filter(Boolean);
            return (
              <Card key={s.id} className="p-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {s.name} <span className="text-xs text-muted-foreground">({s.kind})</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[s.email, s.phone, s.address].filter(Boolean).join(" · ") || "—"}
                    </div>
                    <div className="mt-1 text-xs">
                      MO {Number(s.hourly_rate).toFixed(2)} €/h · Dép.{" "}
                      {Number(s.travel_rate).toFixed(2)} € · 1/2j{" "}
                      {Number(s.half_day_rate).toFixed(2)} € · Jour {Number(s.day_rate).toFixed(2)}{" "}
                      €
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Types : {st.join(", ") || "non renseigné"}
                    </div>
                  </div>
                  <div className="flex">
                    <Button variant="ghost" size="icon" onClick={() => openEditor(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => confirm("Supprimer ?") && remove.mutate(s.id)}
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
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Modifier" : "Nouveau"} SST / technicien</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Nom *</Label>
                <Input name="name" required defaultValue={edit?.name} />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  name="kind"
                  defaultValue={edit?.kind ?? "sst"}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="sst">Sous-traitant</option>
                  <option value="technicien">Technicien</option>
                </select>
              </div>
              <div>
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={edit?.email} />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input name="phone" defaultValue={edit?.phone} />
              </div>
              <div className="md:col-span-2">
                <Label>Adresse</Label>
                <Input name="address" defaultValue={edit?.address} />
              </div>
              <div>
                <Label>Latitude</Label>
                <Input
                  name="latitude"
                  type="number"
                  step="0.000001"
                  defaultValue={edit?.latitude}
                />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input
                  name="longitude"
                  type="number"
                  step="0.000001"
                  defaultValue={edit?.longitude}
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label>MO €/h</Label>
                <Input
                  name="hourly_rate"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.hourly_rate ?? 0}
                />
              </div>
              <div>
                <Label>Dép. forfait</Label>
                <Input
                  name="travel_rate"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.travel_rate ?? 0}
                />
              </div>
              <div>
                <Label>Forfait 1/2 journée</Label>
                <Input
                  name="half_day_rate"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.half_day_rate ?? 0}
                />
              </div>
              <div>
                <Label>Forfait jour</Label>
                <Input
                  name="day_rate"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.day_rate ?? 0}
                />
              </div>
              <div>
                <Label>Km inclus</Label>
                <Input
                  name="included_km"
                  type="number"
                  step="0.1"
                  defaultValue={edit?.included_km ?? 0}
                />
              </div>
              <div>
                <Label>€/km supplémentaire</Label>
                <Input
                  name="extra_km_rate"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.extra_km_rate ?? 0}
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Conditions paiement</Label>
                <Input name="payment_terms" defaultValue={edit?.payment_terms} />
              </div>
              <div>
                <Label>Titulaire</Label>
                <Input name="account_holder" defaultValue={edit?.account_holder} />
              </div>
              <div>
                <Label>IBAN</Label>
                <Input name="iban" defaultValue={edit?.iban} />
              </div>
              <div>
                <Label>BIC</Label>
                <Input name="bic" defaultValue={edit?.bic} />
              </div>
            </div>
            <div>
              <Label>Types d’installation travaillés</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {types.map((t: any) => {
                  const checked = links.some(
                    (l: any) => l.subcontractor_id === edit?.id && l.installation_type_id === t.id,
                  );
                  return (
                    <label key={t.id} className="flex items-center gap-2 text-sm">
                      <Checkbox name="installation_type_id" value={t.id} defaultChecked={checked} />
                      {t.name}
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Zone d’intervention (cliquez sur la carte)</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setZone([])}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Réinitialiser
                </Button>
              </div>
              <EditableMap zone={zone} onClick={addZonePoint} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea name="notes" defaultValue={edit?.notes} rows={3} />
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

function FranceMap({ sites, subcontractors }: { sites: any[]; subcontractors: any[] }) {
  return (
    <Card className="overflow-hidden p-4">
      <div className="mb-3 flex items-center gap-2 font-medium">
        <MapPinned className="h-4 w-4" />
        Carte France — sites et SST / techniciens
      </div>
      <div className="relative h-[520px] overflow-hidden rounded-lg border bg-[#dcead7] bg-[url('https://tile.openstreetmap.org/6/31/22.png')] bg-cover">
        {subcontractors.map(
          (s: any) =>
            Array.isArray(s.intervention_zone) &&
            s.intervention_zone.length > 2 && (
              <Polygon
                key={s.id}
                points={s.intervention_zone}
                className="fill-primary/10 stroke-primary"
              />
            ),
        )}
        {sites.map((s: any) => (
          <Marker
            key={s.id}
            point={{ lat: Number(s.latitude), lng: Number(s.longitude) }}
            label={s.name}
            color="bg-blue-600"
          />
        ))}
        {subcontractors
          .filter((s: any) => s.latitude && s.longitude)
          .map((s: any) => (
            <Marker
              key={s.id}
              point={{ lat: Number(s.latitude), lng: Number(s.longitude) }}
              label={s.name}
              color="bg-amber-500"
            />
          ))}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Fond OpenStreetMap, projection simplifiée pour positionner rapidement les points en France.
        Bleu = sites, orange = SST / techniciens.
      </div>
    </Card>
  );
}
function EditableMap({
  zone,
  onClick,
}: {
  zone: Point[];
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      onClick={onClick}
      className="relative h-80 cursor-crosshair overflow-hidden rounded-lg border bg-[#dcead7] bg-[url('https://tile.openstreetmap.org/6/31/22.png')] bg-cover"
    >
      <Polygon points={zone} className="fill-primary/20 stroke-primary" />
      {zone.map((p, i) => (
        <Marker key={i} point={p} label={`${i + 1}`} color="bg-primary" />
      ))}
    </div>
  );
}
function Marker({ point, label, color }: { point: Point; label: string; color: string }) {
  const p = toPct(point);
  return (
    <div
      title={label}
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${p.x}%`, top: `${p.y}%` }}
    >
      <div className={`h-3 w-3 rounded-full ${color} ring-2 ring-white`} />
      <div className="mt-1 max-w-32 truncate rounded bg-background/90 px-1 text-[10px] shadow">
        {label}
      </div>
    </div>
  );
}
function Polygon({ points, className }: { points: Point[]; className: string }) {
  if (points.length < 2) return null;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      <polygon
        points={points
          .map((p) => {
            const q = toPct(p);
            return `${q.x},${q.y}`;
          })
          .join(" ")}
        className={className}
        strokeWidth="0.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
