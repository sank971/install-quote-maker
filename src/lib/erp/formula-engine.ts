import type { FormulaDefinition, CalculationLog } from "./types";

const SAFE_EXPRESSION = /^[\d\s+\-*/()._,a-zA-Z]+$/;

export function evaluateExpression(expression: string, context: Record<string, number>) {
  if (!SAFE_EXPRESSION.test(expression)) throw new Error(`Formule non sécurisée: ${expression}`);
  const args = Object.keys(context);
  const values = args.map((key) => Number(context[key]) || 0);
  // Formules administrables: ex. "widthMm * heightMm / 1000000". Pas d'accès global.
  return Number(
    Function(...args, `"use strict"; return (${expression.replace(/,/g, ".")});`)(...values),
  );
}

export function runFormulas(formulas: FormulaDefinition[], initialContext: Record<string, number>) {
  const metrics = { ...initialContext };
  const logs: CalculationLog[] = [];
  formulas
    .filter((formula) => formula.is_active !== false)
    .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
    .forEach((formula) => {
      const value = evaluateExpression(formula.expression, metrics);
      metrics[formula.target_key] = value;
      logs.push({
        step: "formula",
        message: `${formula.name}: ${value}`,
        details: { code: formula.code },
      });
    });
  return { metrics, logs };
}
