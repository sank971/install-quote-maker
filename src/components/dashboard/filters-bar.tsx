/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Filters, Period } from "@/lib/analytics";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const periodLabels: Record<Period, string> = {
  day: "Aujourd'hui",
  week: "7 jours",
  month: "30 jours",
  quarter: "3 mois",
  year: "12 mois",
  all: "Tout",
  custom: "Personnalisée",
};

type Props = {
  filters: Filters;
  onChange: (f: Filters) => void;
  clients: any[];
  sites: any[];
  contracts: any[];
  installationTypes: any[];
  brands: any[];
  suppliers: any[];
};

export function FiltersBar({ filters, onChange, clients, sites, contracts, installationTypes, brands, suppliers }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const clear = () => onChange({ period: "month" });
  const hasFilters =
    filters.clientId || filters.siteId || filters.contractId || filters.installationTypeId || filters.brandId || filters.supplierId;

  return (
    <div className="mb-6 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Période</Label>
          <Select value={filters.period} onValueChange={(v) => set({ period: v as Period })}>
            <SelectTrigger className="mt-1 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(periodLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {filters.period === "custom" && (
          <>
            <div>
              <Label className="text-xs">Du</Label>
              <Input type="date" value={filters.from ?? ""} onChange={(e) => set({ from: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Au</Label>
              <Input type="date" value={filters.to ?? ""} onChange={(e) => set({ to: e.target.value })} className="mt-1" />
            </div>
          </>
        )}
        <FilterSelect label="Client" value={filters.clientId} onChange={(v) => set({ clientId: v })} options={clients} />
        <FilterSelect label="Site" value={filters.siteId} onChange={(v) => set({ siteId: v })} options={sites} />
        <FilterSelect label="Contrat" value={filters.contractId} onChange={(v) => set({ contractId: v })} options={contracts} labelKey="name" fallback="contract_number" />
        <FilterSelect label="Type" value={filters.installationTypeId} onChange={(v) => set({ installationTypeId: v })} options={installationTypes} />
        <FilterSelect label="Marque" value={filters.brandId} onChange={(v) => set({ brandId: v })} options={brands} />
        <FilterSelect label="Fournisseur" value={filters.supplierId} onChange={(v) => set({ supplierId: v })} options={suppliers} />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <X className="mr-1 h-4 w-4" /> Réinitialiser
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  labelKey = "name",
  fallback,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  options: any[];
  labelKey?: string;
  fallback?: string;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value ?? "__all"} onValueChange={(v) => onChange(v === "__all" ? undefined : v)}>
        <SelectTrigger className="mt-1 w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">Tous</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o[labelKey] ?? (fallback ? o[fallback] : o.id)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
