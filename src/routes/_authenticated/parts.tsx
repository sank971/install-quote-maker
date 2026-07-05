import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import {
  Plus,
  Search,
  Package,
  Pencil,
  Trash2,
  Link as LinkIcon,
  Boxes,
  Download,
  Upload,
  Calculator,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { downloadCsv, importCsvFile, pick } from "@/lib/csv";

const parseCsvNumber = (value: string) => Number(value.replace(/\s/g, "").replace(",", ".") || 0);

const parseCsvBoolean = (value: string) =>
  ["1", "true", "oui", "yes", "y", "kit"].includes(normalizeName(value));

const DEFAULT_PART_MARKUP_TIERS = [
  { min: 0, max: 50, coefficient: 2 },
  { min: 50, max: 200, coefficient: 1.7 },
  { min: 200, max: null, coefficient: 1.4 },
];

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const calculateSalePrice = (purchasePrice: number, tiers: any[] = DEFAULT_PART_MARKUP_TIERS) => {
  const tier = tiers
    .map((row: any) => ({
      min: Number(row.min) || 0,
      max: row.max === null || row.max === "" || row.max === undefined ? null : Number(row.max),
      coefficient: Number(row.coefficient) || 1,
    }))
    .sort((a, b) => a.min - b.min)
    .find((row) => purchasePrice >= row.min && (row.max === null || purchasePrice < row.max));
  return roundMoney(purchasePrice * (tier?.coefficient ?? 1));
};

const splitCsvList = (value: string) =>
  value
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const serializeLinkedParts = (
  components: any[],
  parts: any[],
  relationKind: string,
  includeNegotiatedPrice = false,
) =>
  components
    .filter((component: any) => component.relation_kind === relationKind)
    .map((component: any) => {
      const part = parts.find((candidate: any) => candidate.id === component.component_part_id);
      return [
        part?.reference || part?.name || component.component_part_id,
        component.quantity ?? 1,
        includeNegotiatedPrice ? (component.negotiated_price ?? "") : "",
        component.notes ?? "",
      ].join(":");
    })
    .join(" | ");

const parseLinkedParts = (value: string) =>
  splitCsvList(value).map((item) => {
    const [identifier = "", quantity = "1", negotiatedPrice = "", ...notes] = item
      .split(":")
      .map((part) => part.trim());
    return {
      identifier,
      quantity: parseCsvNumber(quantity) || 1,
      negotiated_price: negotiatedPrice ? parseCsvNumber(negotiatedPrice) : null,
      notes: notes.join(":") || null,
    };
  });

const serializeKitContractPrices = (kitPrices: any[], contracts: any[]) =>
  kitPrices
    .map((price: any) => {
      const contract = contracts.find((candidate: any) => candidate.id === price.contract_id);
      return [
        contract?.name || price.contract_id,
        price.negotiated_price ?? "",
        price.notes ?? "",
      ].join(":");
    })
    .join(" | ");

const parseKitContractPrices = (value: string) =>
  splitCsvList(value).map((item) => {
    const [contractName = "", negotiatedPrice = "", ...notes] = item
      .split(":")
      .map((part) => part.trim());
    return {
      contractName,
      negotiated_price: parseCsvNumber(negotiatedPrice),
      notes: notes.join(":") || null,
    };
  });

const raiseImportError = (message: string, error: unknown) => {
  console.error(message, error);
  toast.error(message);
  throw new Error(message);
};

export const Route = createFileRoute("/_authenticated/parts")({
  component: PartsPage,
});

function PartsPage() {
  const { data: parts = [] } = useList<any>("parts", { orderBy: "name", ascending: true });
  const { data: brands = [] } = useList<any>("brands", { orderBy: "name", ascending: true });
  const { data: models = [] } = useList<any>("models");
  const { data: modelCompat = [] } = useList<any>("part_model_compat", {
    orderBy: "part_id",
    ascending: true,
  });
  const { data: typeCompat = [] } = useList<any>("part_type_compat", {
    orderBy: "part_id",
    ascending: true,
  });
  const { data: partComponents = [] } = useList<any>("part_components", {
    orderBy: "position",
    ascending: true,
  });
  const { data: contracts = [] } = useList<any>("contracts", { orderBy: "name", ascending: true });
  const { data: contractKitPrices = [] } = useList<any>("contract_kit_prices");
  const { data: suppliers = [] } = useList<any>("suppliers", { orderBy: "name", ascending: true });
  const { data: supplierParts = [] } = useList<any>("supplier_parts");
  const { data: settings = [] } = useList<any>("app_settings");
  const { data: types = [] } = useList<any>("installation_types", {
    orderBy: "name",
    ascending: true,
  });
  const { data: partCategories = [] } = useList<any>("part_categories", {
    orderBy: "name",
    ascending: true,
  });
  const upsert = useUpsert("parts");
  const remove = useRemove("parts");
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [compatOpen, setCompatOpen] = useState<any>(null);
  const [componentsOpen, setComponentsOpen] = useState<any>(null);
  const [componentDraft, setComponentDraft] = useState({
    quantity: 1,
    relation_kind: "accessory",
    negotiated_price: 0,
    notes: "",
  });
  const [selectedComponentPartIds, setSelectedComponentPartIds] = useState<string[]>([]);
  const [selectedCompatTypeIds, setSelectedCompatTypeIds] = useState<string[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const partPricingSetting = settings.find((setting: any) => setting.key === "part_pricing");
  const partPricing = partPricingSetting?.value ?? {};
  const markupTiers = partPricing.markupTiers ?? DEFAULT_PART_MARKUP_TIERS;
  const annualIncreasePct = Number(partPricing.annualIncreasePct) || 0;

  useEffect(() => {
    if (!open) return;
    const currentSupplierPart = edit?.id
      ? supplierParts.find((sp: any) => sp.part_id === edit.id)
      : null;
    setSelectedSupplierId(currentSupplierPart?.supplier_id ?? "");
    setPurchasePrice(Number(currentSupplierPart?.purchase_price) || 0);
    setSalePrice(Number(edit?.sale_price) || 0);
  }, [edit, open, supplierParts]);

  const supplierPartBySupplier = useMemo(
    () =>
      new Map(
        supplierParts
          .filter((sp: any) => sp.part_id === edit?.id)
          .map((sp: any) => [sp.supplier_id, sp]),
      ),
    [edit?.id, supplierParts],
  );

  const exportPartsSuppliers = () => {
    const rows = parts.flatMap((part: any) => {
      const brand = brands.find((b: any) => b.id === part.brand_id);
      const compatibleTypeIds = new Set(
        typeCompat
          .filter((compat: any) => compat.part_id === part.id)
          .map((compat: any) => compat.type_id),
      );
      const compatibleModelIds = new Set(
        modelCompat
          .filter((compat: any) => compat.part_id === part.id)
          .map((compat: any) => compat.model_id),
      );
      const compatibleModels = models.filter((model: any) => compatibleModelIds.has(model.id));
      const compatibleBrandNames = Array.from(
        new Set(
          compatibleModels
            .map(
              (model: any) =>
                brands.find((candidate: any) => candidate.id === model.brand_id)?.name,
            )
            .filter(Boolean),
        ),
      );
      const links = supplierParts.filter((sp: any) => sp.part_id === part.id);
      const components = partComponents.filter(
        (component: any) => component.parent_part_id === part.id,
      );
      const kitPrices = contractKitPrices.filter((price: any) => price.kit_part_id === part.id);
      const base = {
        piece_nom: part.name,
        piece_reference: part.reference,
        piece_categorie: part.category,
        marque: brand?.name,
        types_portes_compatibles: types
          .filter((type: any) => compatibleTypeIds.has(type.id))
          .map((type: any) => type.name)
          .join(" | "),
        marques_portes_compatibles: compatibleBrandNames.join(" | "),
        modeles_portes_compatibles: compatibleModels
          .map((model: any) => {
            const modelBrand = brands.find(
              (candidate: any) => candidate.id === model.brand_id,
            )?.name;
            const modelType = types.find((type: any) => type.id === model.type_id)?.name;
            return [modelBrand, modelType, model.name].filter(Boolean).join(" - ");
          })
          .join(" | "),
        description: part.description,
        longueur_m: part.length_meters,
        largeur_m: part.width_meters,
        poids_kg: part.weight_kg,
        prix_vente: part.sale_price,
        unite_chiffrage: part.pricing_unit,
        est_kit: part.is_kit ? "oui" : "non",
        pieces_composantes: serializeLinkedParts(components, parts, "kit_component"),
        options_prix_negocie: serializeLinkedParts(components, parts, "negotiated_option", true),
        accessoires_lies: serializeLinkedParts(components, parts, "accessory"),
        tarifs_negocies_kit: serializeKitContractPrices(kitPrices, contracts),
      };
      if (links.length === 0) return [{ ...base }];
      return links.map((link: any) => {
        const supplier = suppliers.find((s: any) => s.id === link.supplier_id);
        return {
          ...base,
          fournisseur_nom: supplier?.name,
          fournisseur_email: supplier?.email,
          fournisseur_telephone: supplier?.phone,
          ref_fournisseur: link.supplier_ref,
          prix_achat: link.purchase_price,
          frais_port: link.shipping_cost,
          delai_jours: link.lead_time_days,
        };
      });
    });
    downloadCsv("pieces_fournisseurs.csv", rows, [
      "piece_nom",
      "piece_reference",
      "piece_categorie",
      "marque",
      "types_portes_compatibles",
      "marques_portes_compatibles",
      "modeles_portes_compatibles",
      "description",
      "longueur_m",
      "largeur_m",
      "poids_kg",
      "prix_vente",
      "unite_chiffrage",
      "est_kit",
      "pieces_composantes",
      "options_prix_negocie",
      "accessoires_lies",
      "tarifs_negocies_kit",
      "fournisseur_nom",
      "fournisseur_email",
      "fournisseur_telephone",
      "ref_fournisseur",
      "prix_achat",
      "frais_port",
      "delai_jours",
    ]);
  };

  const importPartsSuppliers = () =>
    importCsvFile(async (rows) => {
      const { data: userData } = await supabase.auth.getUser();
      const owner_id = userData.user?.id;
      if (!owner_id) return toast.error("Non authentifié");
      const partCache = new Map(
        parts.map((p: any) => [`${(p.reference || "").toLowerCase()}|${p.name.toLowerCase()}`, p]),
      );
      const supplierCache = new Map(suppliers.map((s: any) => [s.name.toLowerCase(), s]));
      const brandCache = new Map(brands.map((brand: any) => [normalizeName(brand.name), brand]));
      const typeCache = new Map(types.map((type: any) => [normalizeName(type.name), type]));
      const contractCache = new Map(
        contracts.map((contract: any) => [normalizeName(contract.name), contract]),
      );
      const modelCache = new Map(
        models.map((model: any) => [
          `${model.brand_id}|${model.type_id ?? ""}|${normalizeName(model.name)}`,
          model,
        ]),
      );
      const getOrCreateBrand = async (name: string) => {
        const key = normalizeName(name);
        if (!key) return null;
        const cached = brandCache.get(key);
        if (cached) return cached;
        const { data, error } = await (supabase.from("brands") as any)
          .upsert({ owner_id, name: name.trim() }, { onConflict: "owner_id,name" })
          .select()
          .single();
        if (error) raiseImportError(`Impossible de créer la marque ${name}`, error);
        brandCache.set(key, data);
        return data;
      };
      const getOrCreateType = async (name: string) => {
        const key = normalizeName(name);
        if (!key) return null;
        const cached = typeCache.get(key);
        if (cached) return cached;
        const { data, error } = await (supabase.from("installation_types") as any)
          .upsert({ owner_id, name: name.trim() }, { onConflict: "owner_id,name" })
          .select()
          .single();
        if (error) raiseImportError(`Impossible de créer le type de porte ${name}`, error);
        typeCache.set(key, data);
        return data;
      };
      const getOrCreateModel = async (name: string, brand: any, type: any | null) => {
        const key = `${brand.id}|${type?.id ?? ""}|${normalizeName(name)}`;
        const cached = modelCache.get(key);
        if (cached) return cached;
        const { data, error } = await (supabase.from("models") as any)
          .upsert(
            { owner_id, brand_id: brand.id, type_id: type?.id ?? null, name: name.trim() },
            { onConflict: "owner_id,brand_id,type_id,name" },
          )
          .select()
          .single();
        if (error) raiseImportError(`Impossible de créer le modèle de porte ${name}`, error);
        modelCache.set(key, data);
        return data;
      };
      for (const row of rows) {
        const partName = pick(
          row,
          "piece_nom",
          "pièce_nom",
          "piece",
          "pièce",
          "part_name",
          "nom",
          "name",
        );
        if (!partName) continue;
        const reference = pick(
          row,
          "piece_reference",
          "pièce_reference",
          "reference",
          "ref_piece",
          "réf_pièce",
        );
        const normalizedPartName = partName.toLowerCase();
        const normalizedReference = reference.toLowerCase();
        const partKey = `${normalizedReference}|${normalizedPartName}`;
        let part =
          partCache.get(partKey) ??
          parts.find(
            (p: any) =>
              (normalizedReference && (p.reference || "").toLowerCase() === normalizedReference) ||
              p.name.toLowerCase() === normalizedPartName,
          );
        const partBrandName = pick(row, "marque", "piece_marque", "marque_piece", "brand");
        const partBrand = partBrandName ? await getOrCreateBrand(partBrandName) : null;
        const isKitValue = pick(row, "est_kit", "kit", "is_kit");
        const partPayload = {
          owner_id,
          name: partName,
          reference: reference || null,
          category: pick(row, "piece_categorie", "category") || null,
          brand_id: partBrand?.id ?? null,
          description: pick(row, "description") || null,
          sale_price: parseCsvNumber(pick(row, "prix_vente", "sale_price")),
          pricing_unit: pick(row, "unite_chiffrage", "pricing_unit") || "unit",
          length_meters: pick(row, "longueur_m", "length_meters") ? parseCsvNumber(pick(row, "longueur_m", "length_meters")) : null,
          width_meters: pick(row, "largeur_m", "width_meters") ? parseCsvNumber(pick(row, "largeur_m", "width_meters")) : null,
          weight_kg: pick(row, "poids_kg", "weight_kg") ? parseCsvNumber(pick(row, "poids_kg", "weight_kg")) : null,
        };
        if (part) {
          const { data, error } = await (supabase.from("parts") as any)
            .update(partPayload)
            .eq("id", part.id)
            .select()
            .single();
          if (error) raiseImportError(`Impossible de mettre à jour la pièce ${partName}`, error);
          part = data;
        } else {
          const { data, error } = await (supabase.from("parts") as any)
            .insert(partPayload)
            .select()
            .single();
          if (error) raiseImportError(`Impossible de créer la pièce ${partName}`, error);
          part = data;
        }
        partCache.set(partKey, part);
        partCache.set(`|${normalizedPartName}`, part);
        if (normalizedReference)
          partCache.set(`${normalizedReference}|${normalizedPartName}`, part);

        const compatibleTypeNames = splitCsvList(
          pick(row, "types_portes_compatibles", "type_porte", "type_de_porte", "door_type"),
        );
        const compatibleBrandNames = splitCsvList(
          pick(row, "marques_portes_compatibles", "marque_porte", "marque_de_porte", "door_brand"),
        );
        const compatibleModelNames = splitCsvList(
          pick(row, "modeles_portes_compatibles", "modele_porte", "modele_de_porte", "door_model"),
        );
        const compatibleTypes = (
          await Promise.all(compatibleTypeNames.map((name) => getOrCreateType(name)))
        ).filter(Boolean);
        const compatibleBrands = (
          await Promise.all(compatibleBrandNames.map((name) => getOrCreateBrand(name)))
        ).filter(Boolean);
        if (compatibleTypes.length > 0) {
          const typeRows = compatibleTypes.map((type: any) => ({
            owner_id,
            part_id: part.id,
            type_id: type.id,
          }));
          const { error } = await supabase
            .from("part_type_compat")
            .upsert(typeRows, { onConflict: "part_id,type_id" });
          if (error)
            raiseImportError(`Impossible de créer les compatibilités type pour ${partName}`, error);
        }
        const compatibleModels = [];
        for (const modelLabel of compatibleModelNames) {
          const labelParts = modelLabel
            .split(" - ")
            .map((item) => item.trim())
            .filter(Boolean);
          const explicitModelName = labelParts.at(-1) ?? modelLabel;
          const labelBrand = labelParts.length >= 3 ? await getOrCreateBrand(labelParts[0]) : null;
          const labelType = labelParts.length >= 3 ? await getOrCreateType(labelParts[1]) : null;
          const candidateBrands = labelBrand ? [labelBrand] : compatibleBrands;
          const candidateTypes = labelType ? [labelType] : compatibleTypes;
          const existingMatches = Array.from(modelCache.values()).filter((model: any) => {
            const sameName = normalizeName(model.name) === normalizeName(explicitModelName);
            const sameBrand =
              candidateBrands.length === 0 ||
              candidateBrands.some((brand: any) => brand.id === model.brand_id);
            const sameType =
              candidateTypes.length === 0 ||
              candidateTypes.some((type: any) => type.id === model.type_id);
            return sameName && sameBrand && sameType;
          });
          compatibleModels.push(...existingMatches);
          if (candidateBrands.length === 0) continue;
          for (const brand of candidateBrands) {
            const typesToCreate = candidateTypes.length > 0 ? candidateTypes : [null];
            for (const type of typesToCreate) {
              const model = await getOrCreateModel(explicitModelName, brand, type);
              if (model) compatibleModels.push(model);
            }
          }
        }
        const uniqueCompatibleModels = Array.from(
          new Map(compatibleModels.map((model: any) => [model.id, model])).values(),
        );
        if (uniqueCompatibleModels.length > 0) {
          const modelRows = uniqueCompatibleModels.map((model: any) => ({
            owner_id,
            part_id: part.id,
            model_id: model.id,
          }));
          const { error } = await supabase
            .from("part_model_compat")
            .upsert(modelRows, { onConflict: "part_id,model_id" });
          if (error)
            raiseImportError(
              `Impossible de créer les compatibilités modèle pour ${partName}`,
              error,
            );
        }

        const findPartByIdentifier = (identifier: string) => {
          const normalizedIdentifier = normalizeName(identifier);
          return Array.from(partCache.values()).find(
            (candidate: any) =>
              normalizeName(candidate.reference || "") === normalizedIdentifier ||
              normalizeName(candidate.name) === normalizedIdentifier,
          );
        };

        const componentImports = [
          {
            value: pick(row, "pieces_composantes", "composants", "components"),
            relation_kind: "kit_component",
          },
          {
            value: pick(row, "options_prix_negocie", "options_prix_négocié", "options"),
            relation_kind: "negotiated_option",
          },
          {
            value: pick(row, "accessoires_lies", "accessoires_liés", "accessoires", "accessories"),
            relation_kind: "accessory",
          },
        ];
        const componentRows = componentImports.flatMap(({ value, relation_kind }) =>
          parseLinkedParts(value).flatMap((linkedPart, index) => {
            const componentPart = findPartByIdentifier(linkedPart.identifier);
            if (!componentPart || componentPart.id === part.id) return [];
            return [
              {
                owner_id,
                parent_part_id: part.id,
                component_part_id: componentPart.id,
                quantity: linkedPart.quantity,
                relation_kind,
                negotiated_price:
                  relation_kind === "negotiated_option" ? (linkedPart.negotiated_price ?? 0) : null,
                notes: linkedPart.notes,
                position: index,
              },
            ];
          }),
        );
        if (componentRows.length > 0) {
          const { error } = await (supabase.from("part_components" as any) as any).upsert(
            componentRows,
            { onConflict: "parent_part_id,component_part_id" },
          );
          if (error)
            raiseImportError(`Impossible d’importer les liens de pièces pour ${partName}`, error);
        }

        const kitPriceRows = parseKitContractPrices(
          pick(row, "tarifs_negocies_kit", "tarifs_négociés_kit", "kit_prices"),
        ).flatMap((kitPrice) => {
          const contract = contractCache.get(normalizeName(kitPrice.contractName));
          if (!contract) return [];
          return [
            {
              owner_id,
              contract_id: contract.id,
              kit_part_id: part.id,
              negotiated_price: kitPrice.negotiated_price,
              notes: kitPrice.notes,
            },
          ];
        });
        if (kitPriceRows.length > 0) {
          const { error } = await (supabase.from("contract_kit_prices" as any) as any).upsert(
            kitPriceRows,
            { onConflict: "contract_id,kit_part_id" },
          );
          if (error)
            raiseImportError(`Impossible d’importer les tarifs négociés du kit ${partName}`, error);
        }

        const supplierName = pick(
          row,
          "fournisseur_nom",
          "fournisseur",
          "supplier_name",
          "supplier",
          "nom_fournisseur",
        );
        if (!supplierName || !part) continue;
        let supplier = supplierCache.get(supplierName.toLowerCase());
        const supplierPayload = {
          owner_id,
          name: supplierName,
          email:
            pick(row, "fournisseur_email", "email_fournisseur", "supplier_email", "email") || null,
          phone:
            pick(
              row,
              "fournisseur_telephone",
              "fournisseur_téléphone",
              "telephone_fournisseur",
              "supplier_phone",
            ) || null,
        };
        if (supplier) {
          const { data, error } = await (supabase.from("suppliers") as any)
            .update(supplierPayload)
            .eq("id", supplier.id)
            .select()
            .single();
          if (error)
            raiseImportError(`Impossible de mettre à jour le fournisseur ${supplierName}`, error);
          supplier = data;
        } else {
          const { data, error } = await (supabase.from("suppliers") as any)
            .insert(supplierPayload)
            .select()
            .single();
          if (error) raiseImportError(`Impossible de créer le fournisseur ${supplierName}`, error);
          supplier = data;
        }
        supplierCache.set(supplierName.toLowerCase(), supplier);
        const { error: supplierPartError } = await (supabase.from("supplier_parts") as any).upsert(
          {
            owner_id,
            supplier_id: supplier.id,
            part_id: part.id,
            supplier_ref: pick(row, "ref_fournisseur") || null,
            purchase_price: parseCsvNumber(pick(row, "prix_achat", "purchase_price")),
            shipping_cost: parseCsvNumber(pick(row, "frais_port", "shipping_cost")),
            lead_time_days: pick(row, "delai_jours", "lead_time_days")
              ? parseCsvNumber(pick(row, "delai_jours", "lead_time_days"))
              : null,
            price_updated_at: new Date().toISOString(),
          },
          { onConflict: "supplier_id,part_id" },
        );
        if (supplierPartError)
          raiseImportError(
            `Impossible de lier ${supplierName} à la pièce ${partName}`,
            supplierPartError,
          );
      }
      qc.invalidateQueries({ queryKey: ["parts"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["supplier_parts"] });
      qc.invalidateQueries({ queryKey: ["brands"] });
      qc.invalidateQueries({ queryKey: ["installation_types"] });
      qc.invalidateQueries({ queryKey: ["models"] });
      qc.invalidateQueries({ queryKey: ["part_type_compat"] });
      qc.invalidateQueries({ queryKey: ["part_model_compat"] });
      qc.invalidateQueries({ queryKey: ["part_components"] });
      qc.invalidateQueries({ queryKey: ["contract_kit_prices"] });
      toast.success("Pièces, fournisseurs, kits et compatibilités importés");
    });

  const applyAnnualIncrease = async () => {
    if (annualIncreasePct <= 0)
      return toast.error("Définissez d’abord un pourcentage annuel dans Paramètres.");
    if (
      !confirm(
        `Appliquer ${annualIncreasePct}% d’augmentation à tous les prix de vente des pièces ?`,
      )
    )
      return;
    for (const part of parts) {
      await upsert.mutateAsync({
        id: part.id,
        sale_price: roundMoney(Number(part.sale_price) * (1 + annualIncreasePct / 100)),
      });
    }
    toast.success("Augmentation annuelle appliquée aux prix fixes");
  };

  const filtered = parts.filter((p) =>
    [p.name, p.reference, p.category]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  const openNew = (isKit = false) => {
    setEdit({ is_kit: isKit, sale_price: 0 });
    setOpen(true);
  };
  const openEdit = (p: any) => {
    setEdit(p);
    setOpen(true);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const isKit = fd.get("is_kit") === "on";
    const shouldOpenCompositionAfterSave = !edit.id && isKit;
    const savedPart = await upsert.mutateAsync({
      id: edit.id,
      name: fd.get("name"),
      reference: fd.get("reference") || null,
      category: fd.get("category") || null,
      brand_id: fd.get("brand_id") || null,
      description: fd.get("description") || null,
      sale_price: Number(fd.get("sale_price") ?? salePrice ?? 0),
      pricing_unit: fd.get("pricing_unit") || "unit",
      length_meters: fd.get("length_meters") ? Number(fd.get("length_meters")) : null,
      width_meters: fd.get("width_meters") ? Number(fd.get("width_meters")) : null,
      weight_kg: fd.get("weight_kg") ? Number(fd.get("weight_kg")) : null,
      is_kit: isKit,
      is_oversized: fd.get("is_oversized") === "on",
    });
    const supplierId = fd.get("supplier_id") as string | null;
    if (supplierId) {
      const { data: userData } = await supabase.auth.getUser();
      const owner_id = userData.user!.id;
      const { error } = await (supabase.from("supplier_parts" as any) as any).upsert(
        {
          owner_id,
          supplier_id: supplierId,
          part_id: savedPart.id,
          purchase_price: Number(fd.get("purchase_price") ?? purchasePrice ?? 0),
          shipping_cost: Number(
            fd.get("shipping_cost") ?? supplierPartBySupplier.get(supplierId)?.shipping_cost ?? 0,
          ),
          price_updated_at: new Date().toISOString(),
        },
        { onConflict: "supplier_id,part_id" },
      );
      if (error) {
        toast.error(error.message);
        return;
      }
      qc.invalidateQueries({ queryKey: ["supplier_parts"] });
    }
    setOpen(false);
    if (shouldOpenCompositionAfterSave) {
      setComponentsOpen(savedPart);
      setSelectedComponentPartIds([]);
      setComponentDraft({
        quantity: 1,
        relation_kind: "kit_component",
        negotiated_price: 0,
        notes: "",
      });
      toast.info("Ajoutez maintenant les pièces qui composent le kit et ses options");
    }
  };

  const toggleCompat = async (partId: string, modelId: string, present: boolean) => {
    const { data: userData } = await supabase.auth.getUser();
    const owner_id = userData.user!.id;
    if (present) {
      const { error } = await supabase
        .from("part_model_compat")
        .delete()
        .eq("part_id", partId)
        .eq("model_id", modelId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("part_model_compat")
        .insert({ part_id: partId, model_id: modelId, owner_id });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["part_model_compat"] });
  };

  const openCompat = (part: any) => {
    setCompatOpen(part);
    setSelectedCompatTypeIds(
      typeCompat.filter((c: any) => c.part_id === part.id).map((c: any) => c.type_id),
    );
  };

  const addComponents = async (parentPartId: string) => {
    if (selectedComponentPartIds.length === 0) {
      return toast.error("Sélectionnez au moins une pièce");
    }
    if (selectedComponentPartIds.includes(parentPartId)) {
      return toast.error("Une pièce ne peut pas être composante d’elle-même");
    }
    const { data: userData } = await supabase.auth.getUser();
    const owner_id = userData.user!.id;
    const siblings = partComponents.filter((c: any) => c.parent_part_id === parentPartId);
    const existingComponentIds = new Set(siblings.map((c: any) => c.component_part_id));
    const componentsToAdd = selectedComponentPartIds.filter((id) => !existingComponentIds.has(id));

    if (componentsToAdd.length === 0) {
      return toast.info("Toutes les pièces sélectionnées sont déjà liées");
    }

    const { error } = await (supabase.from("part_components" as any) as any).upsert(
      componentsToAdd.map((componentPartId, index) => ({
        parent_part_id: parentPartId,
        component_part_id: componentPartId,
        owner_id,
        quantity: Number(componentDraft.quantity) || 1,
        relation_kind: componentDraft.relation_kind,
        position: siblings.length + index,
        negotiated_price:
          componentDraft.relation_kind === "negotiated_option"
            ? Number(componentDraft.negotiated_price) || 0
            : null,
        notes: componentDraft.notes || null,
      })),
    );
    if (error) return toast.error(error.message);
    setComponentDraft({ quantity: 1, relation_kind: "accessory", negotiated_price: 0, notes: "" });
    setSelectedComponentPartIds([]);
    qc.invalidateQueries({ queryKey: ["part_components"] });
    toast.success(
      componentsToAdd.length > 1 ? `${componentsToAdd.length} pièces liées` : "Pièce liée",
    );
  };

  const toggleSelectedComponent = (componentPartId: string) => {
    setSelectedComponentPartIds((current) =>
      current.includes(componentPartId)
        ? current.filter((id) => id !== componentPartId)
        : [...current, componentPartId],
    );
  };

  const removeComponent = async (parentPartId: string, componentPartId: string) => {
    const { error } = await (supabase.from("part_components" as any) as any)
      .delete()
      .eq("parent_part_id", parentPartId)
      .eq("component_part_id", componentPartId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["part_components"] });
    toast.success("Pièce supprimée");
  };

  const updateComponent = async (
    parentPartId: string,
    componentPartId: string,
    patch: Partial<{
      quantity: number;
      relation_kind: string;
      negotiated_price: number | null;
      notes: string | null;
    }>,
  ) => {
    const { error } = await (supabase.from("part_components" as any) as any)
      .update(patch)
      .eq("parent_part_id", parentPartId)
      .eq("component_part_id", componentPartId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["part_components"] });
  };

  const toggleTypeCompat = async (partId: string, typeId: string, present: boolean) => {
    setSelectedCompatTypeIds((current) =>
      present ? current.filter((id) => id !== typeId) : [...current, typeId],
    );
    const { data: userData } = await supabase.auth.getUser();
    const owner_id = userData.user!.id;
    if (present) {
      const { error } = await supabase
        .from("part_type_compat")
        .delete()
        .eq("part_id", partId)
        .eq("type_id", typeId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("part_type_compat")
        .insert({ part_id: partId, type_id: typeId, owner_id });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["part_type_compat"] });
  };

  return (
    <div>
      <PageHeader
        title="Pièces"
        description="Bibliothèque de pièces et compatibilités"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportPartsSuppliers}>
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
            <Button variant="outline" onClick={importPartsSuppliers}>
              <Upload className="mr-2 h-4 w-4" />
              Importer CSV
            </Button>
            <Button variant="outline" onClick={applyAnnualIncrease}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Augmentation annuelle
            </Button>
            <Button onClick={() => openNew(false)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle pièce
            </Button>
            <Button onClick={() => openNew(true)}>
              <Boxes className="mr-2 h-4 w-4" />
              Nouveau kit
            </Button>
          </div>
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
          title="Aucune pièce ou kit"
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={applyAnnualIncrease}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Augmentation annuelle
              </Button>
              <Button onClick={() => openNew(false)}>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle pièce
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => {
            const brand = brands.find((b: any) => b.id === p.brand_id);
            const modelCompatCount = modelCompat.filter((c: any) => c.part_id === p.id).length;
            const typeCompatCount = typeCompat.filter((c: any) => c.part_id === p.id).length;
            const componentCount = partComponents.filter(
              (c: any) => c.parent_part_id === p.id,
            ).length;
            const linkedSupplierParts = supplierParts.filter((sp: any) => sp.part_id === p.id);
            const linkedSupplierNames = linkedSupplierParts
              .map(
                (sp: any) =>
                  suppliers.find((supplier: any) => supplier.id === sp.supplier_id)?.name,
              )
              .filter(Boolean);
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[p.reference, p.category, brand?.name].filter(Boolean).join(" · ") || "—"}
                      </div>
                      <div className="mt-1 text-xs">
                        <span className="text-muted-foreground">PV : </span>
                        <span className="font-medium">
                          {Number(p.sale_price).toFixed(2)} €/
                          {p.pricing_unit === "linear_meter" ? "ml" : "u"}
                        </span>
                        <span className="mx-2 text-muted-foreground">·</span>
                        <span className="text-muted-foreground">
                          {p.is_kit ? "Kit" : "Pièce"} · Compat. : {typeCompatCount} types ·{" "}
                          {modelCompatCount} modèles
                        </span>
                        {[p.length_meters && `${Number(p.length_meters)} m L`, p.width_meters && `${Number(p.width_meters)} m l`, p.weight_kg && `${Number(p.weight_kg)} kg`].filter(Boolean).length > 0 && (
                          <>
                            <span className="mx-2 text-muted-foreground">·</span>
                            <span className="text-muted-foreground">
                              {[p.length_meters && `L ${Number(p.length_meters)} m`, p.width_meters && `l ${Number(p.width_meters)} m`, p.weight_kg && `${Number(p.weight_kg)} kg`].filter(Boolean).join(" · ")}
                            </span>
                          </>
                        )}
                        {linkedSupplierNames.length > 0 && (
                          <>
                            <span className="mx-2 text-muted-foreground">·</span>
                            <span className="text-muted-foreground">
                              Fournisseur : {linkedSupplierNames.join(", ")}
                            </span>
                          </>
                        )}
                        {componentCount > 0 && (
                          <>
                            <span className="mx-2 text-muted-foreground">·</span>
                            <span className="text-muted-foreground">
                              Composé : {componentCount} pièces
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setComponentsOpen(p);
                        setSelectedComponentPartIds([]);
                        setComponentDraft({
                          quantity: 1,
                          relation_kind: p.is_kit ? "kit_component" : "accessory",
                          negotiated_price: 0,
                          notes: "",
                        });
                      }}
                      title="Gérer la composition de cette pièce ou de ce kit"
                      aria-label="Gérer la composition"
                    >
                      <Boxes className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {p.is_kit ? "Composition / options" : "Accessoires"}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openCompat(p)}
                      title="Gérer les compatibilités"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Supprimer ?")) remove.mutate(p.id);
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
            <DialogTitle>
              {edit?.id ? "Modifier" : edit?.is_kit ? "Nouveau kit" : "Nouvelle pièce"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            {!edit?.id && edit?.is_kit && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
                Créez d’abord la référence du kit. Après l’enregistrement, la fenêtre de composition
                s’ouvrira automatiquement pour ajouter les pièces incluses, les options au prix
                négocié et les accessoires facturés à l’unité.
              </div>
            )}
            <div>
              <Label>Nom *</Label>
              <Input name="name" required defaultValue={edit?.name} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Référence</Label>
                <Input name="reference" defaultValue={edit?.reference} />
              </div>
              <div>
                <Label>Type de pièce</Label>
                <select
                  name="category"
                  defaultValue={edit?.category ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">—</option>
                  {partCategories.map((category: any) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Marque</Label>
                <select
                  name="brand_id"
                  defaultValue={edit?.brand_id ?? ""}
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
                <Label>Prix de vente (€)</Label>
                <Input
                  name="sale_price"
                  type="number"
                  step="0.01"
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Fournisseur</Label>
                <select
                  name="supplier_id"
                  value={selectedSupplierId}
                  onChange={(e) => {
                    const nextSupplierId = e.target.value;
                    const link = supplierPartBySupplier.get(nextSupplierId);
                    setSelectedSupplierId(nextSupplierId);
                    setPurchasePrice(Number(link?.purchase_price) || 0);
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">—</option>
                  {suppliers.map((supplier: any) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedSupplierId && (
                <>
                  <div>
                    <Label>Prix d’achat (€)</Label>
                    <Input
                      name="purchase_price"
                      type="number"
                      step="0.01"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    />
                  </div>
                  <input
                    type="hidden"
                    name="shipping_cost"
                    value={supplierPartBySupplier.get(selectedSupplierId)?.shipping_cost ?? 0}
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setSalePrice(calculateSalePrice(purchasePrice, markupTiers))}
                    >
                      <Calculator className="mr-2 h-4 w-4" />
                      Calculer le prix de vente
                    </Button>
                  </div>
                </>
              )}
              <div>
                <Label>Longueur (m)</Label>
                <Input name="length_meters" type="number" step="0.01" min="0" defaultValue={edit?.length_meters ?? ""} />
              </div>
              <div>
                <Label>Largeur (m)</Label>
                <Input name="width_meters" type="number" step="0.01" min="0" defaultValue={edit?.width_meters ?? ""} />
              </div>
              <div>
                <Label>Poids (kg)</Label>
                <Input name="weight_kg" type="number" step="0.01" min="0" defaultValue={edit?.weight_kg ?? ""} />
              </div>
              <div>
                <Label>Chiffrage</Label>
                <select
                  name="pricing_unit"
                  defaultValue={edit?.pricing_unit ?? "unit"}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="unit">À l’unité</option>
                  <option value="linear_meter">Au mètre linéaire</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input name="is_kit" type="checkbox" defaultChecked={Boolean(edit?.is_kit)} />
                Kit (référence de lot disponible dans les pièces)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  name="is_oversized"
                  type="checkbox"
                  defaultChecked={Boolean(edit?.is_oversized)}
                />
                Pièce hors gabarit
              </label>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea name="description" rows={3} defaultValue={edit?.description} />
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
        open={!!componentsOpen}
        onOpenChange={(o) => {
          if (!o) {
            setComponentsOpen(null);
            setSelectedComponentPartIds([]);
            setComponentDraft({
              quantity: 1,
              relation_kind: "accessory",
              negotiated_price: 0,
              notes: "",
            });
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {componentsOpen?.is_kit ? "Composition et options du kit" : "Accessoires de la pièce"}{" "}
              : {componentsOpen?.name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Séparez les pièces qui composent réellement un kit, les options qui bénéficient du prix
            négocié du kit et les accessoires facturables à l’unité.
          </p>
          <div className="space-y-2">
            {partComponents
              .filter((component: any) => component.parent_part_id === componentsOpen?.id)
              .map((component: any) => {
                const part = parts.find(
                  (candidate: any) => candidate.id === component.component_part_id,
                );
                return (
                  <div
                    key={component.component_part_id}
                    className="grid gap-2 rounded-md border border-border/60 p-2 text-sm sm:grid-cols-[1fr_90px_220px_130px_auto]"
                  >
                    <div>
                      <div className="font-medium">{part?.name ?? "Pièce inconnue"}</div>
                      <div className="text-xs text-muted-foreground">
                        {part?.reference ? `· Réf. ${part.reference}` : ""}{" "}
                        {component.notes ? `· ${component.notes}` : ""}
                      </div>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      defaultValue={component.quantity}
                      aria-label={`Quantité de ${part?.name ?? "la pièce"}`}
                      onBlur={(e) =>
                        updateComponent(componentsOpen.id, component.component_part_id, {
                          quantity: Number(e.target.value) || 1,
                        })
                      }
                    />
                    <select
                      value={component.relation_kind ?? "accessory"}
                      onChange={(e) =>
                        updateComponent(componentsOpen.id, component.component_part_id, {
                          relation_kind: e.target.value,
                          negotiated_price:
                            e.target.value === "negotiated_option"
                              ? Number(component.negotiated_price ?? part?.sale_price ?? 0)
                              : null,
                        })
                      }
                      aria-label={`Type de lien de ${part?.name ?? "la pièce"}`}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      <option value="kit_component">Composition du kit</option>
                      <option value="negotiated_option">Option prix négocié</option>
                      <option value="accessory">Accessoire à l’unité</option>
                    </select>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={component.negotiated_price ?? ""}
                      placeholder={
                        component.relation_kind === "negotiated_option" ? "Prix option €" : "—"
                      }
                      disabled={component.relation_kind !== "negotiated_option"}
                      aria-label={`Prix négocié de ${part?.name ?? "l’option"}`}
                      onBlur={(e) =>
                        updateComponent(componentsOpen.id, component.component_part_id, {
                          negotiated_price:
                            component.relation_kind === "negotiated_option"
                              ? Number(e.target.value) || 0
                              : null,
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        removeComponent(componentsOpen.id, component.component_part_id)
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
          </div>
          <div className="space-y-3 rounded-md border border-border/60 p-3">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ajouter plusieurs pièces
              </div>
              <div className="grid max-h-96 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                {parts
                  .filter((part: any) => part.id !== componentsOpen?.id)
                  .map((part: any) => {
                    const alreadyInComposition = partComponents.some(
                      (component: any) =>
                        component.parent_part_id === componentsOpen?.id &&
                        component.component_part_id === part.id,
                    );
                    return (
                      <label
                        key={part.id}
                        className="flex items-start gap-2 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selectedComponentPartIds.includes(part.id)}
                          disabled={alreadyInComposition}
                          onChange={() => toggleSelectedComponent(part.id)}
                        />
                        <span>
                          <span className="font-medium">{part.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {[
                              part.reference,
                              part.category,
                              alreadyInComposition ? "déjà lié" : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </span>
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[90px_220px_140px_1fr_auto]">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={componentDraft.quantity}
                onChange={(e) =>
                  setComponentDraft((draft) => ({ ...draft, quantity: Number(e.target.value) }))
                }
                placeholder="Qté"
              />
              <select
                value={componentDraft.relation_kind}
                onChange={(e) =>
                  setComponentDraft((draft) => ({ ...draft, relation_kind: e.target.value }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="kit_component">Composition du kit</option>
                <option value="negotiated_option">Option prix négocié</option>
                <option value="accessory">Accessoire à l’unité</option>
              </select>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={componentDraft.negotiated_price}
                onChange={(e) =>
                  setComponentDraft((draft) => ({
                    ...draft,
                    negotiated_price: Number(e.target.value),
                  }))
                }
                placeholder="Prix option €"
                disabled={componentDraft.relation_kind !== "negotiated_option"}
              />
              <Input
                value={componentDraft.notes}
                onChange={(e) =>
                  setComponentDraft((draft) => ({ ...draft, notes: e.target.value }))
                }
                placeholder="Note commune"
              />
              <Button type="button" onClick={() => addComponents(componentsOpen.id)}>
                Ajouter {selectedComponentPartIds.length > 1 ? selectedComponentPartIds.length : ""}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!compatOpen}
        onOpenChange={(o) => {
          if (!o) {
            setCompatOpen(null);
            setSelectedCompatTypeIds([]);
          }
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compatibilité : {compatOpen?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cochez d’abord un ou plusieurs types d’installation, puis sélectionnez les modèles
            compatibles parmi les marques filtrées par ces types.
          </p>
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Types d’installation
              </div>
              {types.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ajoutez d’abord des types dans Paramètres.
                </p>
              ) : (
                <div className="grid gap-1 sm:grid-cols-2">
                  {types.map((t: any) => {
                    const present = typeCompat.some(
                      (c: any) => c.part_id === compatOpen?.id && c.type_id === t.id,
                    );
                    return (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={present}
                          onChange={() => toggleTypeCompat(compatOpen.id, t.id, present)}
                        />
                        <span>{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Modèles d’installation
            </div>
            {selectedCompatTypeIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sélectionnez au moins un type d’installation pour afficher les marques et modèles
                disponibles.
              </p>
            ) : null}
            {brands.map((b: any) => {
              const bModels = models.filter(
                (m: any) => m.brand_id === b.id && selectedCompatTypeIds.includes(m.type_id),
              );
              if (bModels.length === 0) return null;
              return (
                <div key={b.id}>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {b.name}
                  </div>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {bModels.map((m: any) => {
                      const present = modelCompat.some(
                        (c: any) => c.part_id === compatOpen?.id && c.model_id === m.id,
                      );
                      return (
                        <label
                          key={m.id}
                          className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
                        >
                          <input
                            type="checkbox"
                            checked={present}
                            onChange={() => toggleCompat(compatOpen.id, m.id, present)}
                          />
                          <span>
                            {types.find((t: any) => t.id === m.type_id)?.name} · {m.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {brands.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ajoutez d'abord des marques et modèles dans Paramètres.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
