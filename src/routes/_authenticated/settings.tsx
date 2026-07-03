import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useList, useUpsert, useRemove } from "@/lib/db-hooks";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const DEFAULT_TYPES = [
  "Porte coulissante", "Porte sectionnelle", "Rideau métallique",
  "Porte battante", "Portail coulissant", "Portail battant", "Porte souple",
];

function SettingsPage() {
  const types = useList<any>("installation_types", { orderBy: "name", ascending: true });
  const brands = useList<any>("brands", { orderBy: "name", ascending: true });
  const models = useList<any>("models", { orderBy: "name", ascending: true });
  const upType = useUpsert("installation_types");
  const rmType = useRemove("installation_types");
  const upBrand = useUpsert("brands");
  const rmBrand = useRemove("brands");
  const upModel = useUpsert("models");
  const rmModel = useRemove("models");

  const [typeName, setTypeName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [modelName, setModelName] = useState("");
  const [modelBrand, setModelBrand] = useState("");

  const seedTypes = async () => {
    for (const name of DEFAULT_TYPES) {
      if (!types.data?.some((t: any) => t.name === name)) {
        await upType.mutateAsync({ name });
      }
    }
  };

  return (
    <div>
      <PageHeader title="Paramètres" description="Types d'installation, marques et modèles" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Types d'installation</CardTitle>
            {(types.data ?? []).length === 0 && (
              <Button variant="outline" size="sm" onClick={seedTypes}>Charger les types courants</Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="Nouveau type" />
              <Button size="icon" onClick={async () => { if (typeName.trim()) { await upType.mutateAsync({ name: typeName.trim() }); setTypeName(""); } }}><Plus className="h-4 w-4" /></Button>
            </div>
            {(types.data ?? []).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-1.5 text-sm">
                <span className="min-w-0 truncate">{t.name}</span>
                <div className="flex shrink-0 items-center">
                  <Button variant="ghost" size="icon" onClick={() => { const n = prompt("Nouveau nom", t.name); if (n && n.trim()) upType.mutate({ id: t.id, name: n.trim() }); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Supprimer ${t.name} ?`)) rmType.mutate(t.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Marques</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Ex. Record, FAAC..." />
              <Button size="icon" onClick={async () => { if (brandName.trim()) { await upBrand.mutateAsync({ name: brandName.trim() }); setBrandName(""); } }}><Plus className="h-4 w-4" /></Button>
            </div>
            {(brands.data ?? []).map((b: any) => (
              <div key={b.id} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-1.5 text-sm">
                <span>{b.name}</span>
                <Button variant="ghost" size="icon" onClick={() => rmBrand.mutate(b.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Modèles</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2">
              <Label className="text-xs">Marque</Label>
              <select value={modelBrand} onChange={(e) => setModelBrand(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="">Choisir...</option>
                {(brands.data ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div className="flex gap-2">
                <Input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="Ex. STA20" />
                <Button size="icon" disabled={!modelBrand} onClick={async () => { if (modelName.trim()) { await upModel.mutateAsync({ name: modelName.trim(), brand_id: modelBrand }); setModelName(""); } }}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="mt-3 max-h-[300px] overflow-y-auto space-y-1">
              {(models.data ?? []).map((m: any) => {
                const b = brands.data?.find((x: any) => x.id === m.brand_id);
                return (
                  <div key={m.id} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-1.5 text-sm">
                    <span>{b?.name} <span className="text-muted-foreground">— {m.name}</span></span>
                    <Button variant="ghost" size="icon" onClick={() => rmModel.mutate(m.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
