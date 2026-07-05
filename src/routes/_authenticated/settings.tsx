import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useList, useUpsert, useRemove } from "@/lib/db-hooks";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadCsv } from "@/lib/csv";
import { Download, Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const DEFAULT_TYPES = [
  {
    name: "Porte coulissante",
    component_types: [
      "Vantail complet",
      "Profil avant",
      "Profil arrière",
      "Plinthe",
      "Cimaise",
      "Verrou",
      "Chariots",
      "Moteur",
      "Sélecteur de positions",
      "Système de détection",
    ],
    custom_fields: [
      { key: "nombre_vantaux", label: "Nombre de vantaux", type: "number" },
      { key: "taille_vantaux", label: "Taille des vantaux", type: "text" },
    ],
  },
  {
    name: "Porte sectionnelle",
    component_types: ["Moteur", "Ressorts", "Rails", "Système de sécurité"],
    custom_fields: [],
  },
  {
    name: "Rideau métallique",
    component_types: ["Moteur", "Lames", "Boîtier de commande"],
    custom_fields: [],
  },
  {
    name: "Porte battante",
    component_types: ["Ferme-porte", "Paumelles", "Système de détection"],
    custom_fields: [{ key: "nombre_vantaux", label: "Nombre de vantaux", type: "number" }],
  },
  {
    name: "Portail coulissant",
    component_types: ["Moteur", "Crémaillère", "Barre palpeuse", "Système de détection"],
    custom_fields: [],
  },
  {
    name: "Portail battant",
    component_types: ["Barre palpeuse", "Système de détection", "Moteur"],
    custom_fields: [
      { key: "nombre_vantaux", label: "Nombre de vantaux", type: "number" },
      { key: "taille_vantaux", label: "Taille des vantaux", type: "text" },
    ],
  },
  {
    name: "Porte souple",
    component_types: ["Moteur", "Toile", "Barre palpeuse"],
    custom_fields: [],
  },
];

type CustomField = { key: string; label: string; type: "text" | "number" | "date" | "checkbox" };

const toKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
const DEFAULT_PART_MARKUP_TIERS = [
  { min: 0, max: 50, coefficient: 2 },
  { min: 50, max: 200, coefficient: 1.7 },
  { min: 200, max: null, coefficient: 1.4 },
];

const normalizeFields = (fields: any[]): CustomField[] =>
  fields
    .map((f) => ({ key: f.key || toKey(f.label), label: f.label, type: f.type || "text" }))
    .filter((f) => f.key && f.label);

function SettingsPage() {
  const types = useList<any>("installation_types", { orderBy: "name", ascending: true });
  const brands = useList<any>("brands", { orderBy: "name", ascending: true });
  const models = useList<any>("models", { orderBy: "name", ascending: true });
  const partCategories = useList<any>("part_categories", { orderBy: "name", ascending: true });
  const parts = useList<any>("parts", { orderBy: "name", ascending: true });
  const defaultParts = useList<any>("installation_type_default_parts");
  const modelDefaultParts = useList<any>("model_default_parts" as any);
  const settings = useList<any>("app_settings");
  const familyFields = useList<any>("part_family_fields", {
    orderBy: "family_name",
    ascending: true,
  });
  const formulas = useList<any>("calculation_formulas", { orderBy: "position", ascending: true });
  const rules = useList<any>("business_rules", { orderBy: "priority", ascending: true });
  const bomTemplates = useList<any>("bom_templates", { orderBy: "name", ascending: true });
  const upType = useUpsert("installation_types");
  const rmType = useRemove("installation_types");
  const upPartCategory = useUpsert("part_categories");
  const upDefaultPart = useUpsert("installation_type_default_parts", [
    ["installation_type_default_parts"],
  ]);
  const rmDefaultPart = useRemove("installation_type_default_parts", [
    ["installation_type_default_parts"],
  ]);
  const upModelDefaultPart = useUpsert("model_default_parts" as any, [["model_default_parts"]]);
  const rmModelDefaultPart = useRemove("model_default_parts" as any, [["model_default_parts"]]);
  const upSetting = useUpsert("app_settings", [["app_settings"]]);
  const rmPartCategory = useRemove("part_categories");
  const upBrand = useUpsert("brands");
  const rmBrand = useRemove("brands");
  const upModel = useUpsert("models");
  const rmModel = useRemove("models");
  const upFormula = useUpsert("calculation_formulas", [["calculation_formulas"]]);
  const upRule = useUpsert("business_rules", [["business_rules"]]);
  const upFamilyField = useUpsert("part_family_fields", [["part_family_fields"]]);

  const [typeName, setTypeName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [modelName, setModelName] = useState("");
  const [partCategoryName, setPartCategoryName] = useState("");
  const [modelBrand, setModelBrand] = useState("");
  const [modelType, setModelType] = useState("");
  const [typeDraft, setTypeDraft] = useState<any | null>(null);
  const [selectedComponentTypes, setSelectedComponentTypes] = useState<string[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomField["type"]>("text");
  const quoteSetting = settings.data?.find((setting: any) => setting.key === "quote_document");
  const partPricingSetting = settings.data?.find((setting: any) => setting.key === "part_pricing");
  const [quoteDescription, setQuoteDescription] = useState("");
  const [quoteTerms, setQuoteTerms] = useState("");
  const [partPricingDraft, setPartPricingDraft] = useState<any | null>(null);
  const [formulaDraft, setFormulaDraft] = useState({
    code: "surface_m2",
    name: "Surface",
    target_key: "surfaceM2",
    expression: "widthMm * heightMm / 1000000",
  });
  const [ruleDraft, setRuleDraft] = useState({
    code: "R-001",
    name: "Règle configurable",
    conditions: "[]",
    actions: "[]",
  });
  const [fieldDraft, setFieldDraft] = useState({
    family_name: "Moteur",
    field_key: "couple_max",
    label: "Couple maximum",
    field_type: "number",
    unit: "Nm",
  });
  const effectiveQuoteDescription = quoteDescription || quoteSetting?.value?.description || "";
  const effectiveQuoteTerms =
    quoteTerms ||
    quoteSetting?.value?.terms ||
    "Devis valable 30 jours. Bon pour accord : date et signature.";
  const effectivePartPricing = partPricingDraft ??
    partPricingSetting?.value ?? { markupTiers: DEFAULT_PART_MARKUP_TIERS, annualIncreasePct: 0 };
  const partMarkupTiers = effectivePartPricing.markupTiers ?? DEFAULT_PART_MARKUP_TIERS;

  const saveRuleDraft = () => {
    try {
      upRule.mutate({
        code: ruleDraft.code,
        name: ruleDraft.name,
        conditions: JSON.parse(ruleDraft.conditions || "[]"),
        actions: JSON.parse(ruleDraft.actions || "[]"),
        is_active: true,
      });
    } catch {
      toast.error("Le JSON de la règle est invalide");
    }
  };

  const updatePartMarkupTier = (index: number, patch: any) => {
    const tiers = [...partMarkupTiers];
    tiers[index] = { ...tiers[index], ...patch };
    setPartPricingDraft({ ...effectivePartPricing, markupTiers: tiers });
  };

  const seedTypes = async () => {
    const defaultPartCategories = Array.from(
      new Set(DEFAULT_TYPES.flatMap((type) => type.component_types)),
    );
    for (const name of defaultPartCategories) {
      if (!partCategories.data?.some((category: any) => category.name === name)) {
        await upPartCategory.mutateAsync({ name });
      }
    }
    for (const type of DEFAULT_TYPES) {
      if (!types.data?.some((t: any) => t.name === type.name)) {
        await upType.mutateAsync(type);
      }
    }
  };

  const openTypeEditor = (type: any) => {
    setTypeDraft({ ...type, custom_fields: normalizeFields(type.custom_fields ?? []) });
    setSelectedComponentTypes(type.component_types ?? []);
    setNewFieldLabel("");
    setNewFieldType("text");
  };

  const saveTypeDraft = async () => {
    if (!typeDraft?.name?.trim()) return;
    await upType.mutateAsync({
      id: typeDraft.id,
      name: typeDraft.name.trim(),
      component_types: selectedComponentTypes,
      custom_fields: normalizeFields(typeDraft.custom_fields ?? []),
    });
    setTypeDraft(null);
  };

  const formatList = (values: Array<string | null | undefined>) =>
    values.filter(Boolean).join(" | ");

  const formatFields = (fields: any[] = []) =>
    normalizeFields(fields)
      .map((field) => `${field.label} (${field.key}, ${field.type})`)
      .join(" | ");

  const exportDoorSettings = () => {
    const headers = [
      "section",
      "type_installation",
      "types_pieces_presentes",
      "champs_parametres",
      "marque",
      "modele",
      "piece_defaut_type",
      "piece_defaut_modele",
      "type_piece",
      "parametre_cle",
      "parametre_valeur",
    ];

    const typeRows = (types.data ?? []).map((type: any) => ({
      section: "type_installation",
      type_installation: type.name,
      types_pieces_presentes: formatList(type.component_types ?? []),
      champs_parametres: formatFields(type.custom_fields ?? []),
      piece_defaut_type: formatList(
        (defaultParts.data ?? [])
          .filter((row: any) => row.type_id === type.id)
          .map((row: any) => parts.data?.find((part: any) => part.id === row.part_id)?.name),
      ),
    }));

    const modelRows = (models.data ?? []).map((model: any) => {
      const brand = brands.data?.find((item: any) => item.id === model.brand_id);
      const type = types.data?.find((item: any) => item.id === model.type_id);
      return {
        section: "marque_modele",
        type_installation: type?.name ?? "",
        types_pieces_presentes: formatList(type?.component_types ?? []),
        champs_parametres: formatFields(type?.custom_fields ?? []),
        marque: brand?.name ?? "",
        modele: model.name,
        piece_defaut_type: formatList(
          (defaultParts.data ?? [])
            .filter((row: any) => row.type_id === model.type_id)
            .map((row: any) => parts.data?.find((part: any) => part.id === row.part_id)?.name),
        ),
        piece_defaut_modele: formatList(
          (modelDefaultParts.data ?? [])
            .filter((row: any) => row.model_id === model.id)
            .map((row: any) => parts.data?.find((part: any) => part.id === row.part_id)?.name),
        ),
      };
    });

    const partCategoryRows = (partCategories.data ?? []).map((category: any) => ({
      section: "type_piece",
      type_piece: category.name,
    }));

    const settingsRows = (settings.data ?? []).map((setting: any) => ({
      section: "parametre_application",
      parametre_cle: setting.key,
      parametre_valeur:
        typeof setting.value === "string" ? setting.value : JSON.stringify(setting.value ?? {}),
    }));

    downloadCsv(
      "parametres_portes_marques_modeles.csv",
      [...typeRows, ...modelRows, ...partCategoryRows, ...settingsRows],
      headers,
    );
  };

  return (
    <div>
      <PageHeader
        title="Paramètres"
        description="Types d'installation, marques et modèles"
        actions={
          <Button variant="outline" onClick={exportDoorSettings}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV portes
          </Button>
        }
      />

      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">Architecture ERP paramétrable</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-md border bg-background/70 p-3">
            <div className="font-medium">Champs dynamiques par famille</div>
            <p className="text-sm text-muted-foreground">
              {familyFields.data?.length ?? 0} champ(s) configuré(s) pour enrichir les pièces sans
              coder de propriétés métier.
            </p>
            <div className="mt-2 grid gap-2">
              <Input
                value={fieldDraft.family_name}
                onChange={(e) => setFieldDraft({ ...fieldDraft, family_name: e.target.value })}
                placeholder="Famille"
              />
              <Input
                value={fieldDraft.label}
                onChange={(e) =>
                  setFieldDraft({
                    ...fieldDraft,
                    label: e.target.value,
                    field_key: toKey(e.target.value),
                  })
                }
                placeholder="Libellé"
              />
              <Input
                value={fieldDraft.unit}
                onChange={(e) => setFieldDraft({ ...fieldDraft, unit: e.target.value })}
                placeholder="Unité"
              />
              <Button size="sm" onClick={() => upFamilyField.mutate(fieldDraft)}>
                Ajouter le champ
              </Button>
            </div>
          </div>
          <div className="rounded-md border bg-background/70 p-3">
            <div className="font-medium">Formula Engine</div>
            <p className="text-sm text-muted-foreground">
              {formulas.data?.length ?? 0} formule(s) active(s) ou préparée(s).
            </p>
            <div className="mt-2 grid gap-2">
              <Input
                value={formulaDraft.code}
                onChange={(e) => setFormulaDraft({ ...formulaDraft, code: e.target.value })}
                placeholder="Code"
              />
              <Input
                value={formulaDraft.target_key}
                onChange={(e) => setFormulaDraft({ ...formulaDraft, target_key: e.target.value })}
                placeholder="Clé résultat"
              />
              <Input
                value={formulaDraft.expression}
                onChange={(e) => setFormulaDraft({ ...formulaDraft, expression: e.target.value })}
                placeholder="Expression"
              />
              <Button
                size="sm"
                onClick={() => upFormula.mutate({ ...formulaDraft, is_active: true })}
              >
                Enregistrer la formule
              </Button>
            </div>
          </div>
          <div className="rounded-md border bg-background/70 p-3">
            <div className="font-medium">Rule Engine & BOM</div>
            <p className="text-sm text-muted-foreground">
              {rules.data?.length ?? 0} règle(s), {bomTemplates.data?.length ?? 0} nomenclature(s).
            </p>
            <div className="mt-2 grid gap-2">
              <Input
                value={ruleDraft.code}
                onChange={(e) => setRuleDraft({ ...ruleDraft, code: e.target.value })}
                placeholder="Code"
              />
              <Input
                value={ruleDraft.name}
                onChange={(e) => setRuleDraft({ ...ruleDraft, name: e.target.value })}
                placeholder="Nom"
              />
              <Textarea
                value={ruleDraft.conditions}
                onChange={(e) => setRuleDraft({ ...ruleDraft, conditions: e.target.value })}
                placeholder='Conditions JSON [{"field":"surfaceM2","operator":">","value":10}]'
              />
              <Textarea
                value={ruleDraft.actions}
                onChange={(e) => setRuleDraft({ ...ruleDraft, actions: e.target.value })}
                placeholder='Actions JSON [{"type":"add_part_family","part_family":"Ressorts","quantity":2}]'
              />
              <Button size="sm" onClick={saveRuleDraft}>
                Enregistrer la règle
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Types d'installation</CardTitle>
            {(types.data ?? []).length === 0 && (
              <Button variant="outline" size="sm" onClick={seedTypes}>
                Charger les types courants
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                placeholder="Nouveau type"
              />
              <Button
                size="icon"
                onClick={async () => {
                  if (typeName.trim()) {
                    await upType.mutateAsync({ name: typeName.trim() });
                    setTypeName("");
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {(types.data ?? []).map((t: any) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-1.5 text-sm"
              >
                <span className="min-w-0 truncate">{t.name}</span>
                <div className="flex shrink-0 items-center">
                  <Button variant="ghost" size="icon" onClick={() => openTypeEditor(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Supprimer ${t.name} ?`)) rmType.mutate(t.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {typeDraft && (
          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Modifier le type d'installation</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setTypeDraft(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nom</Label>
                <Input
                  value={typeDraft.name ?? ""}
                  onChange={(e) => setTypeDraft({ ...typeDraft, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Types de pièces / organes associés</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(partCategories.data ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
                      Ajoutez d’abord des types de pièces dans les paramètres.
                    </p>
                  ) : (
                    (partCategories.data ?? []).map((category: any) => {
                      const checked = selectedComponentTypes.includes(category.name);
                      return (
                        <label
                          key={category.id}
                          className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedComponentTypes((current) =>
                                checked
                                  ? current.filter((name) => name !== category.name)
                                  : [...current, category.name],
                              )
                            }
                          />
                          <span>{category.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <Label>Pièces ajoutées par défaut à la création d'une installation</Label>
                <div className="mt-2 space-y-2">
                  {(defaultParts.data ?? [])
                    .filter((row: any) => row.type_id === typeDraft.id)
                    .map((row: any) => {
                      const part = parts.data?.find((p: any) => p.id === row.part_id);
                      return (
                        <div
                          key={row.id}
                          className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
                        >
                          <span>{part?.name ?? "Pièce inconnue"}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => rmDefaultPart.mutate(row.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value=""
                    onChange={(e) => {
                      if (e.target.value && typeDraft.id) {
                        upDefaultPart.mutate({ type_id: typeDraft.id, part_id: e.target.value });
                      }
                    }}
                  >
                    <option value="">+ Ajouter une pièce par défaut</option>
                    {(parts.data ?? []).map((part: any) => (
                      <option key={part.id} value={part.id}>
                        {part.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Champs caractéristiques</Label>
                {(typeDraft.custom_fields ?? []).map((field: CustomField, index: number) => (
                  <div
                    key={`${field.key}-${index}`}
                    className="grid gap-2 sm:grid-cols-[1fr_150px_auto]"
                  >
                    <Input
                      value={field.label}
                      onChange={(e) => {
                        const fields = [...(typeDraft.custom_fields ?? [])];
                        fields[index] = {
                          ...field,
                          label: e.target.value,
                          key: toKey(e.target.value),
                        };
                        setTypeDraft({ ...typeDraft, custom_fields: fields });
                      }}
                    />
                    <select
                      value={field.type}
                      onChange={(e) => {
                        const fields = [...(typeDraft.custom_fields ?? [])];
                        fields[index] = { ...field, type: e.target.value as CustomField["type"] };
                        setTypeDraft({ ...typeDraft, custom_fields: fields });
                      }}
                      className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      <option value="text">Texte</option>
                      <option value="number">Nombre</option>
                      <option value="date">Date</option>
                      <option value="checkbox">Oui / non</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setTypeDraft({
                          ...typeDraft,
                          custom_fields: (typeDraft.custom_fields ?? []).filter(
                            (_: any, i: number) => i !== index,
                          ),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    placeholder="Ex. Nombre de vantaux"
                  />
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as CustomField["type"])}
                    className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="text">Texte</option>
                    <option value="number">Nombre</option>
                    <option value="date">Date</option>
                    <option value="checkbox">Oui / non</option>
                  </select>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!newFieldLabel.trim()) return;
                      setTypeDraft({
                        ...typeDraft,
                        custom_fields: [
                          ...(typeDraft.custom_fields ?? []),
                          {
                            key: toKey(newFieldLabel),
                            label: newFieldLabel.trim(),
                            type: newFieldType,
                          },
                        ],
                      });
                      setNewFieldLabel("");
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button onClick={saveTypeDraft}>Enregistrer le type</Button>
            </CardContent>
          </Card>
        )}

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Document de devis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Description page 1</Label>
              <Textarea
                value={effectiveQuoteDescription}
                onChange={(e) => setQuoteDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <Label>CGV / mentions en fin de devis</Label>
              <Textarea
                value={effectiveQuoteTerms}
                onChange={(e) => setQuoteTerms(e.target.value)}
                rows={6}
              />
            </div>
            <Button
              onClick={() =>
                upSetting.mutate({
                  id: quoteSetting?.id,
                  key: "quote_document",
                  value: { description: effectiveQuoteDescription, terms: effectiveQuoteTerms },
                })
              }
            >
              Enregistrer le document de devis
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Calcul des prix de vente des pièces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ces coefficients sont appliqués au prix d’achat uniquement quand vous cliquez sur le
              bouton de calcul dans une fiche pièce. Le prix reste ensuite fixe jusqu’à modification
              manuelle ou augmentation annuelle.
            </p>
            <div className="space-y-2">
              {partMarkupTiers.map((tier: any, index: number) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <div>
                    <Label>Prix achat min (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={tier.min ?? 0}
                      onChange={(e) => updatePartMarkupTier(index, { min: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Prix achat max (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Sans limite"
                      value={tier.max ?? ""}
                      onChange={(e) =>
                        updatePartMarkupTier(index, {
                          max: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Coefficient</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={tier.coefficient ?? 1}
                      onChange={(e) =>
                        updatePartMarkupTier(index, { coefficient: Number(e.target.value) })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="self-end"
                    onClick={() =>
                      setPartPricingDraft({
                        ...effectivePartPricing,
                        markupTiers: partMarkupTiers.filter((_: any, i: number) => i !== index),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setPartPricingDraft({
                    ...effectivePartPricing,
                    markupTiers: [...partMarkupTiers, { min: 0, max: null, coefficient: 1 }],
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une tranche
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setPartPricingDraft({
                    ...effectivePartPricing,
                    markupTiers: DEFAULT_PART_MARKUP_TIERS,
                  })
                }
              >
                Réinitialiser
              </Button>
            </div>
            <div className="max-w-xs">
              <Label>Augmentation annuelle (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={effectivePartPricing.annualIncreasePct ?? 0}
                onChange={(e) =>
                  setPartPricingDraft({
                    ...effectivePartPricing,
                    annualIncreasePct: Number(e.target.value),
                  })
                }
              />
            </div>
            <Button
              onClick={() =>
                upSetting.mutate({
                  id: partPricingSetting?.id,
                  key: "part_pricing",
                  value: effectivePartPricing,
                })
              }
            >
              Enregistrer les paramètres de prix
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Types de pièces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={partCategoryName}
                onChange={(e) => setPartCategoryName(e.target.value)}
                placeholder="Ex. Moteur, radar, carte..."
              />
              <Button
                size="icon"
                onClick={async () => {
                  if (partCategoryName.trim()) {
                    await upPartCategory.mutateAsync({ name: partCategoryName.trim() });
                    setPartCategoryName("");
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {(partCategories.data ?? []).map((category: any) => (
              <div
                key={category.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-1.5 text-sm"
              >
                <span className="min-w-0 truncate">{category.name}</span>
                <div className="flex shrink-0 items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const n = prompt("Nouveau nom", category.name);
                      if (n && n.trim()) upPartCategory.mutate({ id: category.id, name: n.trim() });
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Supprimer ${category.name} ?`))
                        rmPartCategory.mutate(category.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Marques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Ex. Record, FAAC..."
              />
              <Button
                size="icon"
                onClick={async () => {
                  if (brandName.trim()) {
                    await upBrand.mutateAsync({ name: brandName.trim() });
                    setBrandName("");
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {(brands.data ?? []).map((b: any) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-1.5 text-sm"
              >
                <span className="min-w-0 truncate">{b.name}</span>
                <div className="flex shrink-0 items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const n = prompt("Nouveau nom", b.name);
                      if (n && n.trim()) upBrand.mutate({ id: b.id, name: n.trim() });
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Supprimer ${b.name} ?`)) rmBrand.mutate(b.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modèles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2">
              <Label className="text-xs">Marque</Label>
              <select
                value={modelBrand}
                onChange={(e) => setModelBrand(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Choisir...</option>
                {(brands.data ?? []).map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <Label className="text-xs">Type de porte</Label>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Choisir...</option>
                {(types.data ?? []).map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Input
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="Ex. STA20, Speed, Look2..."
                />
                <Button
                  size="icon"
                  disabled={!modelBrand || !modelType}
                  onClick={async () => {
                    if (modelName.trim()) {
                      await upModel.mutateAsync({
                        name: modelName.trim(),
                        brand_id: modelBrand,
                        type_id: modelType || null,
                      });
                      setModelName("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-3 max-h-[300px] overflow-y-auto space-y-1">
              {(models.data ?? []).map((m: any) => {
                const b = brands.data?.find((x: any) => x.id === m.brand_id);
                const t = types.data?.find((x: any) => x.id === m.type_id);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-1.5 text-sm"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <span className="block truncate">
                        {t?.name ?? "Type non défini"} · {b?.name}{" "}
                        <span className="text-muted-foreground">— {m.name}</span>
                      </span>
                      <div className="space-y-1 rounded-md bg-muted/40 p-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          Pièces présentes par défaut sur ce modèle
                        </div>
                        {(modelDefaultParts.data ?? [])
                          .filter((row: any) => row.model_id === m.id)
                          .map((row: any) => {
                            const part = parts.data?.find((p: any) => p.id === row.part_id);
                            return (
                              <div
                                key={row.id}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <span className="truncate">{part?.name ?? "Pièce inconnue"}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => rmModelDefaultPart.mutate(row.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            );
                          })}
                        <select
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              upModelDefaultPart.mutate({
                                model_id: m.id,
                                part_id: e.target.value,
                              });
                            }
                          }}
                        >
                          <option value="">+ Ajouter une pièce modèle</option>
                          {(parts.data ?? []).map((part: any) => (
                            <option key={part.id} value={part.id}>
                              {part.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const n = prompt("Nouveau nom", m.name);
                          if (n && n.trim())
                            upModel.mutate({
                              id: m.id,
                              name: n.trim(),
                              brand_id: m.brand_id,
                              type_id: m.type_id ?? null,
                            });
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Supprimer ${m.name} ?`)) rmModel.mutate(m.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
