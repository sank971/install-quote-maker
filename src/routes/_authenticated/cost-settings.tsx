/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useList } from "@/lib/db-hooks";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_COST_SETTINGS } from "@/lib/analytics";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/cost-settings")({
  component: CostSettingsPage,
});

function CostSettingsPage() {
  const qc = useQueryClient();
  const list = useList<any>("cost_settings");
  const [form, setForm] = useState({ ...DEFAULT_COST_SETTINGS, agency_address: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const row = (list.data ?? [])[0];
    if (row) {
      setForm({
        cost_per_km: Number(row.cost_per_km),
        fuel_price: Number(row.fuel_price),
        vehicle_consumption: Number(row.vehicle_consumption),
        vehicle_cost_per_km: Number(row.vehicle_cost_per_km),
        technician_hourly_cost: Number(row.technician_hourly_cost),
        admin_hourly_cost: Number(row.admin_hourly_cost),
        average_shipping_cost: Number(row.average_shipping_cost),
        minimum_margin_pct: Number(row.minimum_margin_pct),
        agency_address: row.agency_address ?? "",
      });
    }
  }, [list.data]);

  const save = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Non authentifié");
      const existing = (list.data ?? [])[0];
      const payload = { ...form, owner_id: userData.user.id };
      const client = supabase.from("cost_settings" as any) as any;
      if (existing) {
        const { error } = await client.update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await client.insert(payload);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["cost_settings"] });
      toast.success("Paramètres enregistrés");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const field = (
    key: keyof typeof form,
    label: string,
    hint?: string,
    type: "number" | "text" = "number",
  ) => (
    <div>
      <Label className="text-sm">{label}</Label>
      <Input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={form[key] as any}
        onChange={(e) => setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
        className="mt-1"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Paramètres de coûts & rentabilité"
        description="Ces valeurs alimentent le calcul de marge nette dans le tableau de bord."
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">Coûts opérationnels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("cost_per_km", "Coût moyen au km (€)", "Coût global à retenir par km")}
            {field("vehicle_cost_per_km", "Coût véhicule par km (€)", "Amortissement, entretien")}
            {field("fuel_price", "Prix carburant (€/L)")}
            {field("vehicle_consumption", "Consommation moyenne (L/100km)")}
            {field("technician_hourly_cost", "Coût horaire technicien (€)")}
            {field("admin_hourly_cost", "Coût horaire administratif (€)")}
            {field("average_shipping_cost", "Coût moyen d'envoi de pièce (€)")}
            {field("minimum_margin_pct", "Marge minimum souhaitée (%)", "Sous ce seuil, la ligne passe en orange")}
          </div>
          <div>
            <Label className="text-sm">Adresse agence (départ technicien)</Label>
            <Input
              value={form.agency_address ?? ""}
              onChange={(e) => setForm({ ...form, agency_address: e.target.value })}
              className="mt-1"
              placeholder="12 rue de l'exemple, 75000 Paris"
            />
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
