import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useList, useUpsert, useRemove, useOne } from "@/lib/db-hooks";
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
import {
  Plus,
  Search,
  Wrench,
  Pencil,
  Trash2,
  Package,
  AlertCircle,
  Calculator,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type CustomField = { key: string; label: string; type: "text" | "number" | "date" | "checkbox" };

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const parseCustomFields = (fields: unknown) => {
  if (typeof fields !== "string") return fields;
  try {
    return JSON.parse(fields || "[]");
  } catch {
    return [];
  }
};

const normalizeCustomFields = (fields: unknown): CustomField[] => {
  const parsed = parseCustomFields(fields);
  return Array.isArray(parsed)
    ? parsed.filter((field): field is CustomField =>
        Boolean(
          field?.key && field?.label && ["text", "number", "date", "checkbox"].includes(field.type),
        ),
      )
    : [];
};

const numberFrom = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const valuesList = (value: unknown) =>
  Array.isArray(value)
    ? value.map(normalizeText).filter(Boolean)
    : String(value ?? "")
        .split(/[|,]/)
        .map(normalizeText)
        .filter(Boolean);

const includesConfiguredValue = (configured: unknown, actual: unknown) => {
  const values = valuesList(configured);
  if (values.length === 0 || !actual) return true;
  return values.includes(normalizeText(actual));
};
type InstalledPartDraft = {
  component_type?: string;
  dimensions?: string;
  color?: string;
  reference_override?: string;
  notes?: string;
  length_meters?: number | string;
  width_meters?: number | string;
  weight_kg?: number | string;
};

export const Route = createFileRoute("/_authenticated/installations")({
  component: Page,
});

function Page() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isDetailRoute = pathname.startsWith("/installation/");

  return isDetailRoute ? <Outlet /> : <InstallationsList />;
}

function InstallationsList() {
  const { data: installs = [] } = useList<any>("installations", {
    orderBy: "name",
    ascending: true,
  });
  const { data: sites = [] } = useList<any>("sites");
  const { data: clients = [] } = useList<any>("clients");
  const { data: types = [] } = useList<any>("installation_types", {
    orderBy: "name",
    ascending: true,
  });
  const { data: brands = [] } = useList<any>("brands", { orderBy: "name", ascending: true });
  const { data: models = [] } = useList<any>("models");
  const { data: contracts = [] } = useList<any>("contracts");
  const { data: parts = [] } = useList<any>("parts", { orderBy: "name", ascending: true });
  const { data: modelCompat = [] } = useList<any>("part_model_compat");
  const { data: typeCompat = [] } = useList<any>("part_type_compat");
  const { data: installationParts = [] } = useList<any>("installation_parts");
  const { data: defaultParts = [] } = useList<any>("installation_type_default_parts");
  const { data: modelDefaultParts = [] } = useList<any>("model_default_parts" as any);
  const { data: installationRequirements = [] } = useList<any>("installation_requirements");
  const { data: settings = [] } = useList<any>("app_settings");
  const upsert = useUpsert("installations");
  const remove = useRemove("installations");
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [brandId, setBrandId] = useState<string>("");
  const [typeId, setTypeId] = useState<string>("");
  const [modelId, setModelId] = useState<string>("");
  const [partsOpen, setPartsOpen] = useState<any>(null);
  const [partDrafts, setPartDrafts] = useState<Record<string, InstalledPartDraft>>({});
  const [configOpen, setConfigOpen] = useState<any>(null);
  const [configForm, setConfigForm] = useState({
    width_meters: "",
    height_meters: "",
    blade_part_id: "",
    final_blade_part_id: "",
    curtain_weight_kg: "",
    optional_part_ids: [] as string[],
    winding_direction: "interieur",
  });
  const configuratorSetting = settings.find(
    (setting: any) => setting.key === "metal_curtain_configurator",
  );
  const configuratorBladeOptions: any[] = configuratorSetting?.value?.bladeOptions ?? [];
  const configuratorBladePartIds: string[] = configuratorSetting?.value?.bladePartIds ?? [];
  const configuratorRequiredPartIds: string[] = configuratorSetting?.value?.requiredPartIds ?? [];
  const configuratorFinalBladePartIds: string[] =
    configuratorSetting?.value?.finalBladePartIds ?? [];
  const configuratorAxes: any[] = configuratorSetting?.value?.axes ?? [];
  const configuratorOptionalParts: any[] = configuratorSetting?.value?.optionalParts ?? [];

  // Requirements state
  const [requirementsOpen, setRequirementsOpen] = useState<any>(null);
  const [requirementsForm, setRequirementsForm] = useState<any>({});

  const normalizeName = normalizeText;

  const getCompatibleParts = (installation: any) => {
    if (!installation?.id) return [];
    const ids = new Set<string>();
    const installationModel = models.find((m: any) => m.id === installation.model_id);
    const effectiveTypeId = installation.type_id || installationModel?.type_id;
    const installationType = types.find((t: any) => t.id === effectiveTypeId);
    const componentTypes = new Set(
      (installationType?.component_types ?? []).map((name: string) => normalizeName(name)),
    );

    if (installation.model_id) {
      modelCompat
        .filter((c: any) => c.model_id === installation.model_id)
        .forEach((c: any) => ids.add(c.part_id));
    }
    if (effectiveTypeId) {
      typeCompat
        .filter((c: any) => c.type_id === effectiveTypeId)
        .forEach((c: any) => ids.add(c.part_id));
    }
    return parts.filter(
      (p: any) => ids.has(p.id) || (p.category && componentTypes.has(normalizeName(p.category))),
    );
  };

  const getPresentParts = (installationId: string) =>
    installationParts
      .filter((x: any) => x.installation_id === installationId)
      .map((x: any) => ({ ...x, part: parts.find((p: any) => p.id === x.part_id) }))
      .filter((x: any) => x.part);

  const openPartsDialog = (installation: any) => {
    const drafts = Object.fromEntries(
      installationParts
        .filter((x: any) => x.installation_id === installation.id)
        .map((x: any) => [
          x.part_id,
          {
            component_type:
              x.component_type ?? parts.find((p: any) => p.id === x.part_id)?.category ?? "",
            dimensions: x.dimensions ?? "",
            color: x.color ?? "",
            reference_override: x.reference_override ?? "",
            notes: x.notes ?? "",
            length_meters: x.length_meters ?? "",
            width_meters: x.width_meters ?? "",
            weight_kg: x.weight_kg ?? "",
          },
        ]),
    );
    setPartDrafts(drafts);
    setPartsOpen(installation);
  };

  const openConfigurator = (installation: any) => {
    setConfigOpen(installation);
    setConfigForm({
      width_meters:
        installation.characteristics?.largeur ?? installation.characteristics?.width ?? "",
      height_meters:
        installation.characteristics?.hauteur ?? installation.characteristics?.height ?? "",
      blade_part_id: "",
      final_blade_part_id: "",
      curtain_weight_kg:
        installation.characteristics?.poids ?? installation.characteristics?.weight ?? "",
      optional_part_ids: [],
      winding_direction: installation.characteristics?.sens_enroulement ?? "interieur",
    });
  };

  const getBladeWidthOption = (partId: string) =>
    configuratorBladeOptions.find((option) => option.partId === partId);

  const isBladeAllowedForWidth = (partId: string, curtainWidth: number) => {
    const option = getBladeWidthOption(partId);
    if (!option || curtainWidth <= 0) return true;
    const minWidth = Number(option.minWidthMeters) || 0;
    const maxWidth = Number(option.maxWidthMeters) || Infinity;
    return curtainWidth >= minWidth && curtainWidth <= maxWidth;
  };

  const getConfiguratorBladeParts = (installation: any) => {
    const compatibleParts = getCompatibleParts(installation);
    const curtainWidth = Number(configForm.width_meters) || 0;
    const bladeParts =
      configuratorBladePartIds.length > 0
        ? parts.filter((part: any) => configuratorBladePartIds.includes(part.id))
        : compatibleParts.filter((part: any) =>
            String(part.category ?? part.name)
              .toLowerCase()
              .includes("lame"),
          );
    return bladeParts.filter((part: any) => isBladeAllowedForWidth(part.id, curtainWidth));
  };

  const getBladeCount = (blade: any) => {
    const height = Number(configForm.height_meters) || 0;
    const bladeHeight = Number(blade?.width_meters || 0);
    return bladeHeight > 0 && height > 0 ? Math.ceil(height / bladeHeight) : 1;
  };

  const getCalculatedCurtainWeight = () => {
    const blade = parts.find((part: any) => part.id === configForm.blade_part_id);
    const width = Number(configForm.width_meters) || 0;
    const bladeWeight = Number(blade?.weight_kg) || 0;
    if (!blade || width <= 0 || bladeWeight <= 0) return 0;
    return getBladeCount(blade) * width * bladeWeight;
  };

  const getConfiguratorFinalBladeParts = () =>
    parts.filter((part: any) => configuratorFinalBladePartIds.includes(part.id));

  const getSuggestedAxis = () => {
    const width = Number(configForm.width_meters) || 0;
    const weight = getCalculatedCurtainWeight();
    return configuratorAxes.find((axis) => {
      const min = Number(axis.minLengthMeters) || 0;
      const max = Number(axis.maxLengthMeters) || Infinity;
      const maxWeight = Number(axis.maxWeightKg) || Infinity;
      return width >= min && width <= max && weight <= maxWeight;
    });
  };

  const getSuggestedCoulisse = () => {
    const widthMm = (Number(configForm.width_meters) || 0) * 1000;
    const heightMm = (Number(configForm.height_meters) || 0) * 1000;
    const surfaceM2 = (widthMm * heightMm) / 1_000_000;
    const weightKg = getCalculatedCurtainWeight();
    const blade = parts.find((part: any) => part.id === configForm.blade_part_id);
    const compatibleCoulisses = parts
      .filter((part: any) => normalizeName(part.category) === "coulisse")
      .filter((part: any) => {
        const specs = part.technical_specs ?? {};
        if (specs.actif === false || specs.active === false) return false;
        if (widthMm > 0 && widthMm < numberFrom(specs.largeur_min_rideau_mm, 0)) return false;
        if (widthMm > 0 && widthMm > numberFrom(specs.largeur_max_rideau_mm, Infinity))
          return false;
        if (heightMm > 0 && heightMm < numberFrom(specs.hauteur_min_rideau_mm, 0)) return false;
        if (heightMm > 0 && heightMm > numberFrom(specs.hauteur_max_rideau_mm, Infinity))
          return false;
        if (surfaceM2 > 0 && surfaceM2 > numberFrom(specs.surface_max_tablier_m2, Infinity))
          return false;
        if (weightKg > 0 && weightKg > numberFrom(specs.poids_max_tablier_kg, Infinity))
          return false;
        if (!includesConfiguredValue(specs.types_lame_compatibles, blade?.name ?? blade?.category))
          return false;
        if (
          !includesConfiguredValue(
            specs.largeurs_lame_compatibles_mm,
            blade?.width_meters ? Number(blade.width_meters) * 1000 : null,
          )
        )
          return false;
        if (
          !includesConfiguredValue(
            specs.usages_compatibles,
            configForm.winding_direction === "exterieur" ? "exterieur" : null,
          )
        )
          return false;
        return true;
      });

    return compatibleCoulisses.sort((a: any, b: any) => {
      const aSpecs = a.technical_specs ?? {};
      const bSpecs = b.technical_specs ?? {};
      const aSection =
        numberFrom(aSpecs.hauteur_exterieure_gauche_mm) +
        numberFrom(aSpecs.hauteur_exterieure_droite_mm) +
        numberFrom(aSpecs.largeur_interieure_utile_mm) +
        numberFrom(aSpecs.profondeur_interieure_mm);
      const bSection =
        numberFrom(bSpecs.hauteur_exterieure_gauche_mm) +
        numberFrom(bSpecs.hauteur_exterieure_droite_mm) +
        numberFrom(bSpecs.largeur_interieure_utile_mm) +
        numberFrom(bSpecs.profondeur_interieure_mm);
      return (
        aSection - bSection ||
        numberFrom(a.purchase_price) - numberFrom(b.purchase_price) ||
        numberFrom(aSpecs.priorite_selection, 100) - numberFrom(bSpecs.priorite_selection, 100)
      );
    })[0];
  };

  const saveConfiguratorParts = async () => {
    if (!configOpen || !configForm.blade_part_id) return toast.error("Sélectionnez une lame");
    const blade = parts.find((part: any) => part.id === configForm.blade_part_id);
    const width = Number(configForm.width_meters) || 0;
    const height = Number(configForm.height_meters) || 0;
    const bladeCount = getBladeCount(blade);
    const curtainWeight = getCalculatedCurtainWeight();
    const { data: userData } = await supabase.auth.getUser();
    const owner_id = userData.user!.id;
    const suggestedAxis = getSuggestedAxis();
    const selectedExtraPartIds = [
      ...configuratorRequiredPartIds,
      suggestedAxis?.partId,
      getSuggestedCoulisse()?.id,
      configForm.final_blade_part_id || null,
      ...configForm.optional_part_ids,
    ].filter(Boolean) as string[];
    const requiredRows = Array.from(new Set(selectedExtraPartIds))
      .filter((partId) => partId !== configForm.blade_part_id)
      .map((partId) => {
        const part = parts.find((item: any) => item.id === partId);
        return {
          owner_id,
          installation_id: configOpen.id,
          part_id: partId,
          component_type: part?.category ?? null,
          notes: configuratorOptionalParts.some((item) => item.partId === partId)
            ? `Option configurateur rideau métallique${configuratorOptionalParts.find((item) => item.partId === partId)?.promotionalPrice ? ` · tarif promotionnel ${Number(configuratorOptionalParts.find((item) => item.partId === partId)?.promotionalPrice).toFixed(2)} €` : ""}.`
            : partId === suggestedAxis?.partId
              ? `Axe suggéré par le configurateur (${configForm.width_meters || "?"} m, ${curtainWeight ? curtainWeight.toFixed(1) : "?"} kg).`
              : partId === getSuggestedCoulisse()?.id
                ? `Coulisses suggérées par le configurateur (${configForm.height_meters || "?"} m de hauteur, ${curtainWeight ? curtainWeight.toFixed(1) : "?"} kg).`
                : partId === configForm.final_blade_part_id
                  ? "Lame finale ajoutée par le configurateur rideau métallique."
                  : "Ajouté automatiquement par le configurateur rideau métallique.",
        };
      });
    const { error } = await (supabase.from("installation_parts" as any) as any).upsert(
      [
        {
          owner_id,
          installation_id: configOpen.id,
          part_id: configForm.blade_part_id,
          component_type: blade?.category ?? "Lame",
          length_meters: width || null,
          width_meters: height || null,
          weight_kg: curtainWeight || null,
          notes: `Configurateur: ${bladeCount} lame(s) de ${width || "?"} ml · enroulement ${configForm.winding_direction}. À ajouter au devis en quantité ${bladeCount} × ${width || "?"} ml.`,
        },
        ...requiredRows,
      ],
      { onConflict: "installation_id,part_id" },
    );
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["installation_parts"] });
    toast.success(
      `${bladeCount} lame(s) calculée(s) et ${requiredRows.length} pièce(s) nécessaire(s) ajoutée(s) à l'installation`,
    );
    setConfigOpen(null);
  };

  const openRequirementsDialog = (installation: any) => {
    const existing = installationRequirements.find(
      (r: any) => r.installation_id === installation.id,
    );
    setRequirementsForm({
      installation_id: installation.id,
      requires_multiple_technicians: existing?.requires_multiple_technicians ?? false,
      multiple_technicians_count: existing?.multiple_technicians_count ?? 1,
      requires_lifting_equipment: existing?.requires_lifting_equipment ?? false,
      lifting_equipment_type: existing?.lifting_equipment_type ?? "",
      requires_special_equipment: existing?.requires_special_equipment ?? false,
      special_equipment_description: existing?.special_equipment_description ?? "",
      price_adjustment_pct: existing?.price_adjustment_pct ?? 0,
      notes: existing?.notes ?? "",
    });
    setRequirementsOpen(installation);
  };

  const updatePartDraft = (partId: string, patch: InstalledPartDraft) =>
    setPartDrafts((current) => ({
      ...current,
      [partId]: { ...(current[partId] ?? {}), ...patch },
    }));

  const toggleInstallationPart = async (
    installationId: string,
    partId: string,
    present: boolean,
  ) => {
    const { data: userData } = await supabase.auth.getUser();
    const owner_id = userData.user!.id;
    const table = supabase.from("installation_parts" as any) as any;
    const { error } = present
      ? await table.delete().eq("installation_id", installationId).eq("part_id", partId)
      : await table.insert({
          installation_id: installationId,
          part_id: partId,
          owner_id,
          component_type:
            partDrafts[partId]?.component_type ||
            parts.find((p: any) => p.id === partId)?.category ||
            null,
          dimensions: partDrafts[partId]?.dimensions || null,
          color: partDrafts[partId]?.color || null,
          reference_override: partDrafts[partId]?.reference_override || null,
          notes: partDrafts[partId]?.notes || null,
          length_meters:
            partDrafts[partId]?.length_meters !== "" &&
            partDrafts[partId]?.length_meters !== undefined
              ? Number(partDrafts[partId]?.length_meters || 0)
              : null,
          width_meters:
            partDrafts[partId]?.width_meters !== "" &&
            partDrafts[partId]?.width_meters !== undefined
              ? Number(partDrafts[partId]?.width_meters || 0)
              : null,
          weight_kg:
            partDrafts[partId]?.weight_kg !== "" && partDrafts[partId]?.weight_kg !== undefined
              ? Number(partDrafts[partId]?.weight_kg || 0)
              : null,
        });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["installation_parts"] });
  };

  const saveInstallationPart = async (installationId: string, partId: string) => {
    const draft = partDrafts[partId] ?? {};
    const { error } = await (supabase.from("installation_parts" as any) as any)
      .update({
        component_type: draft.component_type || null,
        dimensions: draft.dimensions || null,
        color: draft.color || null,
        reference_override: draft.reference_override || null,
        notes: draft.notes || null,
        length_meters:
          draft.length_meters !== "" && draft.length_meters !== undefined
            ? Number(draft.length_meters || 0)
            : null,
        width_meters:
          draft.width_meters !== "" && draft.width_meters !== undefined
            ? Number(draft.width_meters || 0)
            : null,
        weight_kg:
          draft.weight_kg !== "" && draft.weight_kg !== undefined
            ? Number(draft.weight_kg || 0)
            : null,
      })
      .eq("installation_id", installationId)
      .eq("part_id", partId);
    if (error) return toast.error(error.message);
    toast.success("Pièce mise à jour");
    qc.invalidateQueries({ queryKey: ["installation_parts"] });
  };

  const saveRequirements = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const owner_id = userData.user!.id;

    const existing = installationRequirements.find(
      (r: any) => r.installation_id === requirementsForm.installation_id,
    );

    const payload = {
      owner_id,
      installation_id: requirementsForm.installation_id,
      requires_multiple_technicians: requirementsForm.requires_multiple_technicians,
      multiple_technicians_count: Number(requirementsForm.multiple_technicians_count) || 1,
      requires_lifting_equipment: requirementsForm.requires_lifting_equipment,
      lifting_equipment_type: requirementsForm.lifting_equipment_type || null,
      requires_special_equipment: requirementsForm.requires_special_equipment,
      special_equipment_description: requirementsForm.special_equipment_description || null,
      price_adjustment_pct: Number(requirementsForm.price_adjustment_pct) || 0,
      notes: requirementsForm.notes || null,
    };

    if (existing) {
      const { error } = await (supabase.from("installation_requirements" as any) as any)
        .update(payload)
        .eq("id", existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await (supabase.from("installation_requirements" as any) as any).insert(
        payload,
      );
      if (error) return toast.error(error.message);
    }

    toast.success("Exigences mises à jour");
    qc.invalidateQueries({ queryKey: ["installation_requirements"] });
    setRequirementsOpen(null);
  };

  const filtered = installs.filter((i) => {
    const site = sites.find((s) => s.id === i.site_id);
    const client = clients.find((c) => c.id === site?.client_id);
    return [
      i.installation_number,
      i.name,
      i.serial_number,
      site?.site_number,
      site?.name,
      client?.client_number,
      client?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase());
  });

  const openNew = () => {
    setEdit({ characteristics: {} });
    setBrandId("");
    setTypeId("");
    setModelId("");
    setOpen(true);
  };
  const openEdit = (i: any) => {
    setEdit({ ...i, characteristics: i.characteristics ?? {} });
    setBrandId(i.brand_id ?? "");
    setTypeId(i.type_id ?? models.find((model: any) => model.id === i.model_id)?.type_id ?? "");
    setModelId(i.model_id ?? "");
    setOpen(true);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const savedInstallation = await upsert.mutateAsync({
      id: edit.id,
      name: fd.get("name"),
      site_id: fd.get("site_id"),
      type_id: fd.get("type_id") || null,
      brand_id: fd.get("brand_id") || null,
      model_id: fd.get("model_id") || null,
      serial_number: fd.get("serial_number") || null,
      year: fd.get("year") ? Number(fd.get("year")) : null,
      location: fd.get("location") || null,
      contract_id: fd.get("contract_id") || null,
      notes: fd.get("notes") || null,
      characteristics: selectedTypeFields.reduce((acc: Record<string, any>, field) => {
        const value = fd.get(`characteristic_${field.key}`);
        acc[field.key] = field.type === "checkbox" ? value === "on" : value || null;
        return acc;
      }, {}),
    });
    if (!edit.id) {
      const { data: userData } = await supabase.auth.getUser();
      const owner_id = userData.user!.id;
      const defaultPartIds = new Set<string>();
      if (savedInstallation?.model_id) {
        modelDefaultParts
          .filter((row: any) => row.model_id === savedInstallation.model_id)
          .forEach((row: any) => defaultPartIds.add(row.part_id));
      }
      if (savedInstallation?.type_id) {
        defaultParts
          .filter((row: any) => row.type_id === savedInstallation.type_id)
          .forEach((row: any) => defaultPartIds.add(row.part_id));
      }
      const rows = Array.from(defaultPartIds).map((partId) => ({
        owner_id,
        installation_id: savedInstallation.id,
        part_id: partId,
        component_type: parts.find((part: any) => part.id === partId)?.category ?? null,
      }));
      if (rows.length > 0) {
        const { error } = await (supabase.from("installation_parts" as any) as any).insert(rows);
        if (error) toast.error(error.message);
        qc.invalidateQueries({ queryKey: ["installation_parts"] });
      }
    }
    setOpen(false);
  };

  const brandModels = models.filter(
    (m: any) => m.brand_id === brandId && (!typeId || m.type_id === typeId),
  );
  const selectedType = types.find((t: any) => t.id === typeId);
  const selectedTypeFields: CustomField[] = normalizeCustomFields(selectedType?.custom_fields);

  return (
    <div>
      <PageHeader
        title="Installations"
        description="Portes, portails et fermetures suivies"
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle installation
          </Button>
        }
      />
      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Aucune installation"
          description="Ajoutez une installation à un site."
          action={
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle installation
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((i) => {
            const site = sites.find((s) => s.id === i.site_id);
            const client = clients.find((c) => c.id === site?.client_id);
            const model = models.find((m: any) => m.id === i.model_id);
            const type = types.find((t: any) => t.id === (i.type_id || model?.type_id));
            const brand = brands.find((b: any) => b.id === i.brand_id);
            const presentParts = getPresentParts(i.id);
            const requirements = installationRequirements.find(
              (r: any) => r.installation_id === i.id,
            );

            return (
              <Card key={i.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <Link
                        to="/installation/$installationSlug"
                        params={{
                          installationSlug: i.installation_number?.replace("/", "-") ?? i.id,
                        }}
                        className="font-medium hover:underline"
                      >
                        {i.installation_number ? `${i.installation_number} · ` : ""}
                        {i.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {[type?.name, brand?.name, model?.name].filter(Boolean).join(" · ") || "—"}
                      </div>
                      {type?.component_types?.length ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Pièces: {type.component_types.join(", ")}
                        </div>
                      ) : null}

                      {/* Special requirements indicator */}
                      {requirements && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {requirements.requires_multiple_technicians && (
                            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-800 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {requirements.multiple_technicians_count} techniciens
                            </span>
                          )}
                          {requirements.requires_lifting_equipment && (
                            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-800 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Engin levage
                            </span>
                          )}
                          {requirements.requires_special_equipment && (
                            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-800 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Équipement spécial
                            </span>
                          )}
                          {requirements.price_adjustment_pct !== 0 && (
                            <span
                              className={`rounded px-2 py-0.5 text-xs flex items-center gap-1 ${
                                requirements.price_adjustment_pct > 0
                                  ? "bg-red-100 text-red-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {requirements.price_adjustment_pct > 0 ? "+" : ""}
                              {requirements.price_adjustment_pct}% prix
                            </span>
                          )}
                        </div>
                      )}

                      {presentParts.length ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {presentParts.slice(0, 4).map((x: any) => (
                            <span
                              key={x.part_id}
                              className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
                            >
                              {[
                                x.part.name,
                                x.reference_override || x.part.reference,
                                x.length_meters ? `L ${Number(x.length_meters)} m` : null,
                                x.width_meters ? `l ${Number(x.width_meters)} m` : null,
                                x.weight_kg ? `${Number(x.weight_kg)} kg` : null,
                                x.dimensions,
                                x.color,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          ))}
                          {presentParts.length > 4 ? (
                            <span className="rounded bg-muted px-2 py-0.5 text-xs">
                              +{presentParts.length - 4}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {normalizeCustomFields(type?.custom_fields).length ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {normalizeCustomFields(type?.custom_fields).map((field: CustomField) => {
                            const value = i.characteristics?.[field.key];
                            if (value === undefined || value === null || value === "") return null;
                            return (
                              <span
                                key={field.key}
                                className="rounded bg-muted px-2 py-0.5 text-xs"
                              >
                                {field.label}:{" "}
                                {field.type === "checkbox" ? (value ? "Oui" : "Non") : value}
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                      <div className="mt-1 text-xs text-muted-foreground">
                        <Link
                          to="/clients/$clientId"
                          params={{ clientId: site?.client_id }}
                          className="hover:underline"
                        >
                          {client?.name}
                        </Link>
                        {" · "}
                        <Link
                          to="/site/$siteSlug"
                          params={{ siteSlug: site?.site_number ?? site?.id }}
                          className="hover:underline"
                        >
                          {site?.site_number ? `${site.site_number} · ` : ""}
                          {site?.name}
                        </Link>
                        {i.serial_number && ` · SN ${i.serial_number}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openConfigurator(i)}
                      title="Configurateur"
                    >
                      <Calculator className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openPartsDialog(i)}>
                      <Package className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openRequirementsDialog(i)}>
                      <AlertCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(i)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Supprimer ?")) remove.mutate(i.id);
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

      {/* Edit installation dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Modifier" : "Nouvelle"} installation</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Nom *</Label>
                <Input name="name" required defaultValue={edit?.name} />
              </div>
              <div>
                <Label>Site *</Label>
                <select
                  name="site_id"
                  required
                  defaultValue={edit?.site_id ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">—</option>
                  {sites.map((s: any) => {
                    const c = clients.find((x) => x.id === s.client_id);
                    return (
                      <option key={s.id} value={s.id}>
                        {c?.name} — {s.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <Label>Type</Label>
                <select
                  name="type_id"
                  value={typeId}
                  onChange={(e) => {
                    setTypeId(e.target.value);
                    setModelId("");
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">—</option>
                  {types.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Marque</Label>
                <select
                  name="brand_id"
                  value={brandId}
                  onChange={(e) => {
                    setBrandId(e.target.value);
                    setModelId("");
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">—</option>
                  {brands.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Modèle</Label>
                <select
                  name="model_id"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  disabled={!typeId || !brandId}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">
                    {!typeId || !brandId ? "Choisir un type et une marque" : "—"}
                  </option>
                  {brandModels.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>N° de série</Label>
                <Input name="serial_number" defaultValue={edit?.serial_number} />
              </div>
              <div>
                <Label>Année</Label>
                <Input name="year" type="number" defaultValue={edit?.year} />
              </div>
              <div>
                <Label>Localisation sur site</Label>
                <Input name="location" defaultValue={edit?.location} />
              </div>
              {selectedType?.component_types?.length ? (
                <div className="sm:col-span-2 rounded-md border border-border/60 p-3 text-sm">
                  <Label>Types de pièces / organes liés à ce type</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedType.component_types.map((name: string) => (
                      <span key={name} className="rounded-md bg-muted px-2 py-1 text-xs">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {selectedTypeFields.map((field) => (
                <div key={field.key}>
                  <Label>{field.label}</Label>
                  {field.type === "checkbox" ? (
                    <input
                      name={`characteristic_${field.key}`}
                      type="checkbox"
                      defaultChecked={Boolean(edit?.characteristics?.[field.key])}
                      className="mt-3 h-4 w-4"
                    />
                  ) : (
                    <Input
                      name={`characteristic_${field.key}`}
                      type={field.type}
                      defaultValue={edit?.characteristics?.[field.key] ?? ""}
                    />
                  )}
                </div>
              ))}
              <div>
                <Label>Contrat</Label>
                <select
                  name="contract_id"
                  defaultValue={edit?.contract_id ?? ""}
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

      {/* Parts dialog */}
      <Dialog open={!!partsOpen} onOpenChange={(o) => !o && setPartsOpen(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pièces présentes : {partsOpen?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cochez les pièces réellement présentes sur cette installation. Les pièces compatibles
            avec son type ou son modèle sont suggérées pour accélérer les futurs devis.
          </p>
          {partsOpen ? (
            <div className="space-y-4">
              {getCompatibleParts(partsOpen).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune pièce compatible trouvée. Ajoutez les compatibilités depuis la fiche pièce.
                </p>
              ) : (
                <div className="grid gap-2">
                  {getCompatibleParts(partsOpen).map((part: any) => {
                    const present = installationParts.some(
                      (x: any) => x.installation_id === partsOpen.id && x.part_id === part.id,
                    );
                    return (
                      <label
                        key={part.id}
                        className="flex items-start gap-2 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={present}
                          onChange={() => toggleInstallationPart(partsOpen.id, part.id, present)}
                        />
                        <div className="grid flex-1 gap-2 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <span className="font-medium">{part.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {[part.reference, part.category].filter(Boolean).join(" · ")}
                            </span>
                          </div>
                          {present && (
                            <>
                              <Input
                                value={partDrafts[part.id]?.component_type ?? part.category ?? ""}
                                onChange={(e) =>
                                  updatePartDraft(part.id, { component_type: e.target.value })
                                }
                                placeholder="Type de pièce (profil avant...)"
                              />
                              <Input
                                value={partDrafts[part.id]?.reference_override ?? ""}
                                onChange={(e) =>
                                  updatePartDraft(part.id, { reference_override: e.target.value })
                                }
                                placeholder="Référence spécifique"
                              />
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={partDrafts[part.id]?.length_meters ?? ""}
                                onChange={(e) =>
                                  updatePartDraft(part.id, { length_meters: e.target.value })
                                }
                                placeholder={
                                  part.pricing_unit === "linear_meter"
                                    ? "Longueur chiffrée (ml)"
                                    : "Longueur (m)"
                                }
                              />
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={partDrafts[part.id]?.width_meters ?? ""}
                                onChange={(e) =>
                                  updatePartDraft(part.id, { width_meters: e.target.value })
                                }
                                placeholder="Largeur (m)"
                              />
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={partDrafts[part.id]?.weight_kg ?? ""}
                                onChange={(e) =>
                                  updatePartDraft(part.id, { weight_kg: e.target.value })
                                }
                                placeholder="Poids (kg)"
                              />
                              <Input
                                value={partDrafts[part.id]?.dimensions ?? ""}
                                onChange={(e) =>
                                  updatePartDraft(part.id, { dimensions: e.target.value })
                                }
                                placeholder="Dimensions"
                              />
                              <Input
                                value={partDrafts[part.id]?.color ?? ""}
                                onChange={(e) =>
                                  updatePartDraft(part.id, { color: e.target.value })
                                }
                                placeholder="Couleur"
                              />
                              <Input
                                value={partDrafts[part.id]?.notes ?? ""}
                                onChange={(e) =>
                                  updatePartDraft(part.id, { notes: e.target.value })
                                }
                                placeholder="Options (verrou, accessoires...)"
                                className="sm:col-span-2"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="sm:col-span-2"
                                onClick={() => saveInstallationPart(partsOpen.id, part.id)}
                              >
                                Enregistrer les infos de cette pièce
                              </Button>
                            </>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Configurator dialog */}
      <Dialog open={!!configOpen} onOpenChange={(o) => !o && setConfigOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurateur : {configOpen?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Calcule une lame de rideau métallique en quantité × mètre linéaire à partir des
              dimensions de l'installation et ajoute les pièces nécessaires prédéfinies dans les
              paramètres.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Largeur / longueur lame (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={configForm.width_meters}
                  onChange={(e) => setConfigForm({ ...configForm, width_meters: e.target.value })}
                />
              </div>
              <div>
                <Label>Hauteur rideau (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={configForm.height_meters}
                  onChange={(e) => setConfigForm({ ...configForm, height_meters: e.target.value })}
                />
              </div>
              <div>
                <Label>Poids rideau calculé (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={
                    getCalculatedCurtainWeight() ? getCalculatedCurtainWeight().toFixed(1) : ""
                  }
                  readOnly
                  placeholder="Auto"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Calculé avec le poids unitaire de la lame et la quantité × largeur.
                </p>
              </div>
            </div>
            <div>
              <Label>Type de lame</Label>
              {configuratorBladePartIds.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucun type de lame prédéfini : les pièces compatibles contenant “lame” restent
                  proposées.
                </p>
              ) : null}
              <select
                value={configForm.blade_part_id}
                onChange={(e) => setConfigForm({ ...configForm, blade_part_id: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">—</option>
                {getConfiguratorBladeParts(configOpen).map((part: any) => (
                  <option key={part.id} value={part.id}>
                    {part.name} · {Number(part.sale_price).toFixed(2)}€/ml
                    {(() => {
                      const option = getBladeWidthOption(part.id);
                      return option
                        ? ` · largeur ${option.minWidthMeters || 0}-${option.maxWidthMeters || "∞"} m`
                        : "";
                    })()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Lame finale</Label>
              <select
                value={configForm.final_blade_part_id}
                onChange={(e) =>
                  setConfigForm({ ...configForm, final_blade_part_id: e.target.value })
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Sans lame finale</option>
                {getConfiguratorFinalBladeParts().map((part: any) => (
                  <option key={part.id} value={part.id}>
                    {part.name} · {Number(part.sale_price).toFixed(2)}€
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-md border border-border/60 p-3 text-sm">
              <div className="font-medium">Axe suggéré</div>
              <div className="mt-1 text-muted-foreground">
                {(() => {
                  const axis = getSuggestedAxis();
                  const part = parts.find((item: any) => item.id === axis?.partId);
                  return part
                    ? `${part.name} (${axis.minLengthMeters || 0}-${axis.maxLengthMeters || "∞"} m · ${axis.maxWeightKg || "∞"} kg max · poids calculé ${getCalculatedCurtainWeight() ? getCalculatedCurtainWeight().toFixed(1) : "0"} kg)`
                    : "Aucun axe ne correspond à la longueur et au poids renseignés.";
                })()}
              </div>
            </div>

            <div className="rounded-md border border-border/60 p-3 text-sm">
              <div className="font-medium">Coulisses suggérées</div>
              <div className="mt-1 text-muted-foreground">
                {(() => {
                  const coulisse = getSuggestedCoulisse();
                  const specs = coulisse?.technical_specs ?? {};
                  return coulisse
                    ? `${coulisse.name} (${specs.largeur_max_rideau_mm || "∞"} mm max · ${specs.poids_max_tablier_kg || "∞"} kg max · ${specs.quantite_defaut || 2} pièce(s))`
                    : "Aucune coulisse compatible ne correspond aux dimensions et au poids renseignés.";
                })()}
              </div>
            </div>
            {configuratorOptionalParts.length ? (
              <div className="rounded-md border border-border/60 p-3 text-sm">
                <div className="font-medium">Pièces optionnelles</div>
                <div className="mt-2 space-y-2">
                  {configuratorOptionalParts.map((item) => {
                    const part = parts.find((p: any) => p.id === item.partId);
                    return (
                      <label key={item.partId} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={configForm.optional_part_ids.includes(item.partId)}
                          onChange={(e) =>
                            setConfigForm({
                              ...configForm,
                              optional_part_ids: e.target.checked
                                ? [...configForm.optional_part_ids, item.partId]
                                : configForm.optional_part_ids.filter(
                                    (partId) => partId !== item.partId,
                                  ),
                            })
                          }
                        />
                        <span>
                          {part?.name ?? "Pièce supprimée"}
                          {item.promotionalPrice
                            ? ` · promo ${Number(item.promotionalPrice).toFixed(2)} €`
                            : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div>
              <Label>Sens d'enroulement</Label>
              <select
                value={configForm.winding_direction}
                onChange={(e) =>
                  setConfigForm({ ...configForm, winding_direction: e.target.value })
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="interieur">Intérieur</option>
                <option value="exterieur">Extérieur</option>
              </select>
            </div>
            {configuratorRequiredPartIds.length ? (
              <div className="rounded-md border border-border/60 p-3 text-sm">
                <div className="font-medium">Pièces nécessaires ajoutées automatiquement</div>
                <div className="mt-1 text-muted-foreground">
                  {configuratorRequiredPartIds
                    .map((partId) => parts.find((part: any) => part.id === partId)?.name)
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            ) : null}
            <div className="rounded-md bg-muted p-3 text-sm">
              Résultat estimé :{" "}
              {(() => {
                const blade = parts.find((part: any) => part.id === configForm.blade_part_id);
                const h = Number(configForm.height_meters) || 0;
                const bh = Number(blade?.width_meters || 0);
                const weight = getCalculatedCurtainWeight();
                return bh > 0 && h > 0
                  ? `${Math.ceil(h / bh)} lame(s) × ${Number(configForm.width_meters) || 0} ml${weight ? ` · ${weight.toFixed(1)} kg` : ""}`
                  : "renseignez la hauteur de la lame dans la fiche pièce (largeur)";
              })()}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfigOpen(null)}>
              Annuler
            </Button>
            <Button onClick={saveConfiguratorParts}>Ajouter aux pièces présentes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Requirements dialog */}
      <Dialog open={!!requirementsOpen} onOpenChange={(o) => !o && setRequirementsOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Exigences spéciales : {requirementsOpen?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-blue-900">
                Indiquez les exigences spéciales de cette installation pour ajuster automatiquement
                le prix du contrat.
              </p>
            </div>

            {/* Multiple technicians */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={requirementsForm.requires_multiple_technicians}
                  onChange={(e) =>
                    setRequirementsForm({
                      ...requirementsForm,
                      requires_multiple_technicians: e.target.checked,
                    })
                  }
                />
                <span className="text-sm font-medium">Nécessite plusieurs techniciens</span>
              </label>
              {requirementsForm.requires_multiple_technicians && (
                <div className="ml-6">
                  <Label className="text-xs">Nombre de techniciens</Label>
                  <Input
                    type="number"
                    min="2"
                    value={requirementsForm.multiple_technicians_count}
                    onChange={(e) =>
                      setRequirementsForm({
                        ...requirementsForm,
                        multiple_technicians_count: e.target.value,
                      })
                    }
                  />
                </div>
              )}
            </div>

            {/* Lifting equipment */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={requirementsForm.requires_lifting_equipment}
                  onChange={(e) =>
                    setRequirementsForm({
                      ...requirementsForm,
                      requires_lifting_equipment: e.target.checked,
                    })
                  }
                />
                <span className="text-sm font-medium">Nécessite un engin de levage</span>
              </label>
              {requirementsForm.requires_lifting_equipment && (
                <div className="ml-6">
                  <Label className="text-xs">Type d'engin (ex: grue, nacelle...)</Label>
                  <Input
                    value={requirementsForm.lifting_equipment_type}
                    onChange={(e) =>
                      setRequirementsForm({
                        ...requirementsForm,
                        lifting_equipment_type: e.target.value,
                      })
                    }
                    placeholder="Description"
                  />
                </div>
              )}
            </div>

            {/* Special equipment */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={requirementsForm.requires_special_equipment}
                  onChange={(e) =>
                    setRequirementsForm({
                      ...requirementsForm,
                      requires_special_equipment: e.target.checked,
                    })
                  }
                />
                <span className="text-sm font-medium">Nécessite du matériel spécial</span>
              </label>
              {requirementsForm.requires_special_equipment && (
                <div className="ml-6">
                  <Label className="text-xs">Description du matériel</Label>
                  <Input
                    value={requirementsForm.special_equipment_description}
                    onChange={(e) =>
                      setRequirementsForm({
                        ...requirementsForm,
                        special_equipment_description: e.target.value,
                      })
                    }
                    placeholder="Ex: Équipement de mesure laser, outillage spécifique..."
                  />
                </div>
              )}
            </div>

            {/* Price adjustment */}
            <div className="space-y-2">
              <Label className="text-sm">Ajustement de prix du contrat (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={requirementsForm.price_adjustment_pct}
                onChange={(e) =>
                  setRequirementsForm({
                    ...requirementsForm,
                    price_adjustment_pct: e.target.value,
                  })
                }
                placeholder="Ex: +25 pour +25%, -10 pour -10%"
              />
              <p className="text-xs text-muted-foreground">
                {requirementsForm.price_adjustment_pct > 0
                  ? `+${requirementsForm.price_adjustment_pct}% de surcharge`
                  : requirementsForm.price_adjustment_pct < 0
                    ? `${requirementsForm.price_adjustment_pct}% de réduction`
                    : "Aucun ajustement"}
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm">Notes supplémentaires</Label>
              <Textarea
                value={requirementsForm.notes}
                onChange={(e) =>
                  setRequirementsForm({ ...requirementsForm, notes: e.target.value })
                }
                placeholder="Détails sur les exigences spéciales..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setRequirementsOpen(null)}>
              Annuler
            </Button>
            <Button onClick={saveRequirements}>Enregistrer les exigences</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
