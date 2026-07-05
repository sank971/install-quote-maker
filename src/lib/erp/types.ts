export type ErpPart = {
  id: string;
  name: string;
  reference?: string | null;
  category?: string | null;
  sale_price?: number | string | null;
  purchase_price?: number | string | null;
  technical_specs?: Record<string, unknown> | null;
};

export type PartCompatibility = {
  part_id: string;
  target_kind: string;
  target_id?: string | null;
  target_value?: string | null;
};

export type SupplierOffer = {
  id: string;
  supplier_id: string;
  part_id: string;
  purchase_price?: number | string | null;
  lead_time_days?: number | null;
  shipping_cost?: number | string | null;
};

export type FormulaDefinition = {
  code: string;
  name: string;
  target_key: string;
  expression: string;
  is_active?: boolean;
  position?: number;
};

export type RuleCondition = { field: string; operator: string; value: unknown };
export type RuleAction = { type: string; value?: unknown; part_family?: string; quantity?: number };
export type BusinessRule = {
  code: string;
  name: string;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
  is_active?: boolean;
  priority?: number;
};

export type BomItem = {
  part_family: string;
  quantity_formula_code?: string | null;
  selection_strategy?: string | null;
  required?: boolean;
  position?: number;
  quantity?: number;
  constraints?: Record<string, unknown> | null;
};

export type InstallationCalculationInput = {
  installationTypeId?: string;
  installationTypeName?: string;
  brandId?: string;
  modelId?: string;
  widthMm?: number;
  heightMm?: number;
  isMotorized?: boolean;
  options?: Record<string, unknown>;
};

export type CalculationLog = { step: string; message: string; details?: Record<string, unknown> };
export type GeneratedLine = {
  part_id?: string;
  description: string;
  reference?: string;
  category?: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  supplier_id?: string;
};

export type InstallationCalculationResult = {
  metrics: Record<string, number>;
  lines: GeneratedLine[];
  logs: CalculationLog[];
};
