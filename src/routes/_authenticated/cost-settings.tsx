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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
        ...DEFAULT_COST_SETTINGS,
        ...Object.fromEntries(
          Object.entries(DEFAULT_COST_SETTINGS).map(([key, fallback]) => [
            key,
            typeof fallback === "number" ? Number(row[key] ?? fallback) : (row[key] ?? fallback),
          ]),
        ),
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
        onChange={(e) =>
          setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })
        }
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
            {field(
              "minimum_margin_pct",
              "Marge minimum souhaitée (%)",
              "Sous ce seuil, la ligne passe en orange",
            )}
            {field("default_technicians_count", "Nb techniciens par défaut")}
            {field("default_onsite_minutes", "Temps sur site par défaut (min)")}
            {field("default_travel_minutes", "Trajet par défaut (min)")}
            {field("default_admin_before_minutes", "Admin avant intervention (min)")}
            {field("default_admin_after_minutes", "Admin après intervention (min)")}
            {field("default_part_storage_cost", "Stockage pièce par défaut (€)")}
            {field("default_part_preparation_cost", "Préparation pièce par défaut (€)")}
            {field("default_part_packaging_cost", "Emballage pièce par défaut (€)")}
          </div>
          <div className="grid gap-4 rounded-md border bg-muted/20 p-4 sm:grid-cols-2">
            <div>
              <Label className="text-sm">Mode frais généraux</Label>
              <Select
                value={form.overhead_mode}
                onValueChange={(value) => setForm({ ...form, overhead_mode: value as any })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_per_intervention">
                    Montant fixe par intervention
                  </SelectItem>
                  <SelectItem value="fixed_per_hour">Montant fixe par heure</SelectItem>
                  <SelectItem value="revenue_percentage">% du chiffre d'affaires</SelectItem>
                  <SelectItem value="direct_cost_percentage">% du coût direct</SelectItem>
                  <SelectItem value="agency_cost">Coût par agence</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {field("overhead_fixed_amount", "Frais généraux fixes (€)")}
            {field("overhead_hourly_amount", "Frais généraux horaires (€)")}
            {field("overhead_revenue_pct", "% CA frais généraux")}
            {field("overhead_direct_cost_pct", "% coût direct frais généraux")}
            {field("overhead_agency_amount", "Coût agence par intervention (€)")}
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
