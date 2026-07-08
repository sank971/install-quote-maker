/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Save, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useList } from "@/lib/db-hooks";
import { currentUserId } from "@/lib/ticket-workflow";
import { geocodeStorageAddress } from "@/lib/stock-workflow";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/storage-locations")({
  component: StorageLocationsPage,
});

function StorageLocationsPage() {
  const qc = useQueryClient();
  const { data: locations = [] } = useList<any>("storage_locations", {
    orderBy: "name",
    ascending: true,
  });
  const { data: stocks = [] } = useList<any>("storage_location_stocks", { orderBy: "updated_at" });
  const { data: parts = [] } = useList<any>("parts", { orderBy: "name", ascending: true });
  const { data: sites = [] } = useList<any>("sites", { orderBy: "name", ascending: true });
  const [editing, setEditing] = useState<any>(null);

  const invalidate = () =>
    ["storage_locations", "storage_location_stocks"].forEach((t) =>
      qc.invalidateQueries({ queryKey: [t] }),
    );

  const saveLocation = async (event: any) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    try {
      const owner_id = await currentUserId();
      const selectedSiteId = fd.get("site_id") === "__none" ? null : fd.get("site_id") || null;
      const selectedSite = sites.find((site: any) => site.id === selectedSiteId);
      const payload: any = {
        owner_id,
        name: fd.get("name"),
        type: fd.get("type") || "autre",
        address: fd.get("address"),
        postal_code: fd.get("postal_code"),
        city: fd.get("city"),
        country: fd.get("country") || "France",
        site_id: selectedSiteId,
        is_active: fd.get("is_active") === "on",
      };
      if (payload.type === "site" && selectedSite) {
        payload.name = payload.name || `Stock site · ${selectedSite.name}`;
        payload.address = selectedSite.address || payload.address || "Adresse site à compléter";
        payload.postal_code = selectedSite.postal_code ?? payload.postal_code ?? null;
        payload.city = selectedSite.city ?? payload.city ?? null;
        payload.country = selectedSite.country ?? payload.country ?? "France";
        payload.latitude = selectedSite.latitude ?? null;
        payload.longitude = selectedSite.longitude ?? null;
      } else {
        Object.assign(payload, await geocodeStorageAddress(payload));
      }
      const query = editing?.id
        ? (supabase.from("storage_locations" as any) as any).update(payload).eq("id", editing.id)
        : (supabase.from("storage_locations" as any) as any).insert(payload);
      const { error } = await query;
      if (error) throw error;
      setEditing(null);
      event.currentTarget.reset();
      invalidate();
      toast.success("Lieu de stockage enregistré avec coordonnées GPS");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saveStock = async (event: any) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const owner_id = await currentUserId();
    const payload = {
      owner_id,
      storage_location_id: fd.get("storage_location_id"),
      part_id: fd.get("part_id"),
      quantity_available: Number(fd.get("quantity_available") || 0),
      quantity_reserved: Number(fd.get("quantity_reserved") || 0),
      quantity_minimum: Number(fd.get("quantity_minimum") || 0),
    };
    const { error } = await (supabase.from("storage_location_stocks" as any) as any).upsert(
      payload,
      { onConflict: "storage_location_id,part_id" },
    );
    if (error) return toast.error(error.message);
    event.currentTarget.reset();
    invalidate();
    toast.success("Stock mis à jour");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lieux de stockage"
        description="Agences, dépôts, véhicules techniciens et stocks par pièce."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <Plus className="mr-2 inline h-4 w-4" />
            {editing ? "Modifier" : "Créer"} un lieu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveLocation} className="grid gap-3 md:grid-cols-4">
            <Input name="name" placeholder="Nom" defaultValue={editing?.name ?? ""} required />
            <Select name="type" defaultValue={editing?.type ?? "agence"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agence">Agence</SelectItem>
                <SelectItem value="depot">Dépôt</SelectItem>
                <SelectItem value="vehicule_technicien">Véhicule technicien</SelectItem>
                <SelectItem value="site">Stock sur site</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
            <Input
              name="address"
              placeholder="Adresse"
              defaultValue={editing?.address ?? ""}
              required
            />
            <Input
              name="postal_code"
              placeholder="Code postal"
              defaultValue={editing?.postal_code ?? ""}
            />
            <Input name="city" placeholder="Ville" defaultValue={editing?.city ?? ""} />
            <Input name="country" placeholder="Pays" defaultValue={editing?.country ?? "France"} />
            <Select name="site_id" defaultValue={editing?.site_id ?? "__none"}>
              <SelectTrigger>
                <SelectValue placeholder="Site lié (stock sur site)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Aucun site</SelectItem>
                {sites.map((site: any) => (
                  <SelectItem key={site.id} value={site.id}>
                    {[site.site_number, site.name, site.address].filter(Boolean).join(" · ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <input name="is_active" type="checkbox" defaultChecked={editing?.is_active ?? true} />{" "}
              Actif
            </label>
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer + géocoder
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock par lieu</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveStock} className="mb-4 grid gap-3 md:grid-cols-5">
            <Select name="storage_location_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Lieu" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select name="part_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Pièce" />
              </SelectTrigger>
              <SelectContent>
                {parts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input name="quantity_available" type="number" step="1" placeholder="Disponible" />
            <Input name="quantity_reserved" type="number" step="1" placeholder="Réservé" />
            <Input name="quantity_minimum" type="number" step="1" placeholder="Minimum" />
            <Button variant="outline" className="md:col-span-5">
              Mettre à jour le stock
            </Button>
          </form>
          <div className="grid gap-3 md:grid-cols-2">
            {locations.map((loc) => {
              const locStocks = stocks.filter((s) => s.storage_location_id === loc.id);
              return (
                <div key={loc.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <b>
                        <Warehouse className="mr-1 inline h-4 w-4" />
                        {loc.name}
                      </b>
                      <div className="text-xs text-muted-foreground">
                        <MapPin className="mr-1 inline h-3 w-3" />
                        {[loc.address, loc.postal_code, loc.city, loc.country]
                          .filter(Boolean)
                          .join(", ")}
                        {loc.site_id
                          ? ` · Site: ${sites.find((site: any) => site.id === loc.site_id)?.name ?? "lié"}`
                          : ""}{" "}
                        · {loc.latitude?.toFixed?.(4) ?? "—"}, {loc.longitude?.toFixed?.(4) ?? "—"}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(loc)}>
                      Modifier
                    </Button>
                  </div>
                  <Badge variant={loc.is_active ? "secondary" : "outline"}>{loc.type}</Badge>
                  <div className="mt-3 space-y-1 text-sm">
                    {locStocks.length === 0 ? (
                      <span className="text-muted-foreground">Aucun stock</span>
                    ) : (
                      locStocks.map((stock) => {
                        const part = parts.find((p) => p.id === stock.part_id);
                        const real =
                          Number(stock.quantity_available || 0) -
                          Number(stock.quantity_reserved || 0);
                        return (
                          <div key={stock.id} className="flex justify-between">
                            <span>{part?.name ?? "Pièce"}</span>
                            <span>
                              {real} dispo ({stock.quantity_reserved} réservé)
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
