import type { BusinessRule, CalculationLog } from "./types";

const compare = (left: unknown, operator: string, right: unknown) => {
  if (operator === "=") return String(left) === String(right);
  if (operator === "!=") return String(left) !== String(right);
  const l = Number(left);
  const r = Number(right);
  if (operator === ">") return l > r;
  if (operator === ">=") return l >= r;
  if (operator === "<") return l < r;
  if (operator === "<=") return l <= r;
  return false;
};

export function runRules(rules: BusinessRule[], context: Record<string, unknown>) {
  const actions: NonNullable<BusinessRule["actions"]> = [];
  const logs: CalculationLog[] = [];
  rules
    .filter((rule) => rule.is_active !== false)
    .sort((a, b) => Number(a.priority ?? 100) - Number(b.priority ?? 100))
    .forEach((rule) => {
      const matches = (rule.conditions ?? []).every((condition) =>
        compare(context[condition.field], condition.operator, condition.value),
      );
      if (!matches) return;
      actions.push(...(rule.actions ?? []));
      logs.push({
        step: "rule",
        message: `${rule.code} — ${rule.name}`,
        details: { actions: rule.actions ?? [] },
      });
    });
  return { actions, logs };
}
