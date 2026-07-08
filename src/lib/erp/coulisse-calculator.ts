import { selectBestSupplier } from "./supplier-optimizer";
import type {
  CalculationLog,
  ErpPart,
  GeneratedLine,
  InstallationCalculationInput,
  SupplierOffer,
} from "./types";

const norm = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const num = (value: unknown, fallback: unknown = 0) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  const parsedFallback = Number(fallback);
  return Number.isFinite(parsedFallback) ? parsedFallback : 0;
};

const list = (value: unknown) =>
  Array.isArray(value)
    ? value.map(norm).filter(Boolean)
    : String(value ?? "")
        .split(/[|,]/)
        .map(norm)
        .filter(Boolean);

const includesWhenConfigured = (configured: unknown, actual: unknown) => {
  const values = list(configured);
  if (values.length === 0 || !actual) return true;
  return values.includes(norm(actual));
};

const rangeOk = (value: number, min?: unknown, max?: unknown) =>
  value >= num(min, 0) && value <= num(max, Infinity);

const sectionScore = (specs: Record<string, unknown>) =>
  num(specs.hauteur_exterieure_gauche_mm) +
  num(specs.hauteur_exterieure_droite_mm) +
  num(specs.largeur_interieure_utile_mm) +
  num(specs.profondeur_interieure_mm);

export function calculateCoulisse(args: {
  input: InstallationCalculationInput;
  parts: ErpPart[];
  supplierOffers: SupplierOffer[];
  metrics: Record<string, number>;
}): { line?: GeneratedLine; logs: CalculationLog[] } {
  const logs: CalculationLog[] = [];
  if (!norm(args.input.installationTypeName).includes("rideau metallique")) return { logs };

  const widthMm = num(args.input.widthMm);
  const heightMm = num(args.input.heightMm);
  const surfaceM2 = num(args.metrics.surfaceM2, (widthMm * heightMm) / 1_000_000);
  const options = args.input.options ?? {};
  const weightKg = num(
    options.curtainWeightKg ?? options.poidsTablierKg ?? args.metrics.curtainWeightKg,
  );
  const bladeType = options.bladeType ?? options.typeLame;
  const bladeThickness = options.bladeThicknessMm ?? options.epaisseurLameMm;
  const bladeWidth = options.bladeWidthMm ?? options.largeurLameMm;
  const usage = options.usage ?? "standard";
  const poseType = options.poseType ?? options.typePose;

  logs.push({ step: "coulisse", message: `Poids tablier calculé : ${weightKg} kg.` });

  const candidates = args.parts.filter((part) => norm(part.category) === "coulisse");
  const compatible = candidates.flatMap((part) => {
    const specs = part.technical_specs ?? {};
    const reasons: string[] = [];
    if (specs.actif === false || specs.active === false) reasons.push("inactive");
    if (!rangeOk(widthMm, specs.largeur_min_rideau_mm, specs.largeur_max_rideau_mm))
      reasons.push(
        `largeur hors plage ${specs.largeur_min_rideau_mm ?? 0}-${specs.largeur_max_rideau_mm ?? "∞"} mm`,
      );
    if (!rangeOk(heightMm, specs.hauteur_min_rideau_mm, specs.hauteur_max_rideau_mm))
      reasons.push("hauteur hors plage");
    if (num(specs.surface_max_tablier_m2, Infinity) < surfaceM2)
      reasons.push(`surface maximum ${specs.surface_max_tablier_m2} m²`);
    if (num(specs.poids_max_tablier_kg, Infinity) < weightKg)
      reasons.push(`poids maximum ${specs.poids_max_tablier_kg} kg`);
    if (!includesWhenConfigured(specs.types_lame_compatibles, bladeType))
      reasons.push("type de lame incompatible");
    if (!includesWhenConfigured(specs.epaisseurs_lame_compatibles_mm, bladeThickness))
      reasons.push("épaisseur de lame incompatible");
    if (!includesWhenConfigured(specs.largeurs_lame_compatibles_mm, bladeWidth))
      reasons.push("largeur de lame incompatible");
    if (!includesWhenConfigured(specs.usages_compatibles, usage))
      reasons.push("usage incompatible");
    if (!includesWhenConfigured(specs.types_pose_compatibles, poseType))
      reasons.push("type de pose incompatible");
    if (
      options.finalBlade &&
      !includesWhenConfigured(specs.lames_finales_compatibles, options.finalBlade)
    )
      reasons.push("lame finale incompatible");
    if (
      options.locking &&
      !includesWhenConfigured(specs.verrouillages_compatibles, options.locking)
    )
      reasons.push("verrouillage incompatible");
    if (options.lock && !includesWhenConfigured(specs.serrures_compatibles, options.lock))
      reasons.push("serrure incompatible");
    if (options.exterior && !includesWhenConfigured(specs.usages_compatibles, "exterieur"))
      reasons.push("extérieur incompatible");

    if (reasons.length > 0) {
      logs.push({ step: "coulisse", message: `${part.name} refusée : ${reasons.join(", ")}.` });
      return [];
    }
    return [{ part, supplier: selectBestSupplier(part, args.supplierOffers) }];
  });

  const selected = compatible.sort((a, b) => {
    const aSpecs = a.part.technical_specs ?? {};
    const bSpecs = b.part.technical_specs ?? {};
    const aCost = a.supplier?.totalCost ?? num(a.part.purchase_price);
    const bCost = b.supplier?.totalCost ?? num(b.part.purchase_price);
    const aMargin = num(a.part.sale_price) - aCost;
    const bMargin = num(b.part.sale_price) - bCost;
    return (
      sectionScore(aSpecs) - sectionScore(bSpecs) ||
      aCost - bCost ||
      bMargin - aMargin ||
      num(a.supplier?.lead_time_days, 9999) - num(b.supplier?.lead_time_days, 9999) ||
      num(aSpecs.priorite_selection, 100) - num(bSpecs.priorite_selection, 100)
    );
  })[0];

  if (!selected) return { logs };
  const specs = selected.part.technical_specs ?? {};
  const top = num(specs.depassement_haut_defaut_mm, 100);
  const bottom = num(specs.depassement_bas_defaut_mm, 0);
  const quantity = num(specs.quantite_defaut, 2);
  const unitLengthMm = heightMm + top + bottom;
  const saleUnit = norm(specs.unite_vente || specs.sale_unit || "unite");
  const barLengthMm = num(specs.longueur_barre_standard_mm);
  const totalMeters = (unitLengthMm * quantity) / 1000;
  const bars =
    saleUnit === "barre" && barLengthMm > 0
      ? Math.ceil(unitLengthMm / barLengthMm) * quantity
      : quantity;
  const unitCost = saleUnit.includes("metre")
    ? num(specs.prix_achat_metre, selected.supplier?.totalCost ?? selected.part.purchase_price)
    : saleUnit === "barre"
      ? num(selected.supplier?.totalCost ?? selected.part.purchase_price)
      : num(selected.supplier?.totalCost ?? selected.part.purchase_price);
  const unitPrice = saleUnit.includes("metre")
    ? num(specs.prix_vente_metre, selected.part.sale_price)
    : num(selected.part.sale_price);
  const lineQuantity = saleUnit.includes("metre") ? totalMeters : bars;

  logs.push({
    step: "coulisse",
    message: `${selected.part.name} sélectionnée : compatible jusqu'à ${specs.poids_max_tablier_kg ?? "∞"} kg et ${specs.largeur_max_rideau_mm ?? "∞"} mm de largeur.`,
  });
  return {
    line: {
      part_id: selected.part.id,
      description: `${quantity} ${selected.part.name} - longueur ${unitLengthMm} mm`,
      reference: selected.part.reference ?? "",
      category: selected.part.category ?? "Coulisse",
      quantity: lineQuantity,
      unit_price: unitPrice,
      unit_cost: unitCost,
      supplier_id: selected.supplier?.supplier_id,
    },
    logs,
  };
}
