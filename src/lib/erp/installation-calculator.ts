import { runFormulas } from "./formula-engine";
import { runRules } from "./rule-engine";
import { selectBestSupplier } from "./supplier-optimizer";
import type {
  BomItem,
  BusinessRule,
  ErpPart,
  FormulaDefinition,
  InstallationCalculationInput,
  InstallationCalculationResult,
  SupplierOffer,
} from "./types";

const normalize = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export function calculateInstallationQuote(args: {
  input: InstallationCalculationInput;
  parts: ErpPart[];
  supplierOffers: SupplierOffer[];
  formulas: FormulaDefinition[];
  rules: BusinessRule[];
  bomItems: BomItem[];
}): InstallationCalculationResult {
  const base = {
    widthMm: Number(args.input.widthMm) || 0,
    heightMm: Number(args.input.heightMm) || 0,
    isMotorized: args.input.isMotorized ? 1 : 0,
  };
  const formulaResult = runFormulas(args.formulas, base);
  const ruleResult = runRules(args.rules, { ...args.input, ...formulaResult.metrics });
  const logs = [...formulaResult.logs, ...ruleResult.logs];
  const forcedFamilies = ruleResult.actions
    .filter((action) => action.type === "add_part_family" && action.part_family)
    .map((action) => ({
      part_family: String(action.part_family),
      quantity: Number(action.quantity ?? 1),
    }));
  const families = [...args.bomItems, ...forcedFamilies].sort(
    (a, b) => Number(a.position ?? 0) - Number(b.position ?? 0),
  );
  const lines = families.flatMap((item) => {
    const candidates = args.parts.filter(
      (part) => normalize(part.category) === normalize(item.part_family),
    );
    const selected = candidates[0];
    if (!selected) {
      logs.push({
        step: "bom",
        message: `Aucune pièce trouvée pour la famille ${item.part_family}`,
      });
      return [];
    }
    const supplier = selectBestSupplier(selected, args.supplierOffers);
    const quantity = "quantity" in item && item.quantity ? Number(item.quantity) : 1;
    logs.push({
      step: "supplier",
      message: `${selected.name} sélectionné pour ${item.part_family}`,
      details: { supplier_id: supplier?.supplier_id },
    });
    return [
      {
        part_id: selected.id,
        description: selected.name,
        reference: selected.reference ?? "",
        category: selected.category ?? item.part_family,
        quantity,
        unit_price: Number(selected.sale_price) || 0,
        unit_cost: supplier?.totalCost ?? (Number(selected.purchase_price) || 0),
        supplier_id: supplier?.supplier_id,
      },
    ];
  });
  return { metrics: formulaResult.metrics, lines, logs };
}
