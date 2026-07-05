import type { FormulaDefinition, CalculationLog } from "./types";

type Token = { type: "number" | "identifier" | "operator" | "paren"; value: string };

const tokenize = (expression: string): Token[] => {
  const tokens: Token[] = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (/[0-9.,]/.test(char)) {
      let value = "";
      while (index < expression.length && /[0-9.,]/.test(expression[index])) {
        value += expression[index].replace(",", ".");
        index += 1;
      }
      tokens.push({ type: "number", value });
      continue;
    }
    if (/[a-zA-Z_]/.test(char)) {
      let value = "";
      while (index < expression.length && /[a-zA-Z0-9_]/.test(expression[index])) {
        value += expression[index];
        index += 1;
      }
      tokens.push({ type: "identifier", value });
      continue;
    }
    if (["+", "-", "*", "/"].includes(char)) {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }
    if (["(", ")"].includes(char)) {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }
    throw new Error(`Caractère non autorisé dans la formule: ${char}`);
  }
  return tokens;
};

export function evaluateExpression(expression: string, context: Record<string, number>) {
  const tokens = tokenize(expression);
  let index = 0;

  const peek = () => tokens[index];
  const consume = () => tokens[index++];

  const parseFactor = (): number => {
    const token = consume();
    if (!token) throw new Error("Formule incomplète");
    if (token.type === "operator" && token.value === "-") return -parseFactor();
    if (token.type === "number") return Number(token.value) || 0;
    if (token.type === "identifier") return Number(context[token.value]) || 0;
    if (token.type === "paren" && token.value === "(") {
      const value = parseExpression();
      const closing = consume();
      if (closing?.type !== "paren" || closing.value !== ")") {
        throw new Error("Parenthèse fermante manquante");
      }
      return value;
    }
    throw new Error(`Jeton inattendu dans la formule: ${token.value}`);
  };

  const parseTerm = (): number => {
    let value = parseFactor();
    while (peek()?.type === "operator" && ["*", "/"].includes(peek().value)) {
      const operator = consume().value;
      const right = parseFactor();
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  };

  const parseExpression = (): number => {
    let value = parseTerm();
    while (peek()?.type === "operator" && ["+", "-"].includes(peek().value)) {
      const operator = consume().value;
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };

  const result = parseExpression();
  if (index < tokens.length) throw new Error(`Formule invalide près de: ${tokens[index].value}`);
  return Number.isFinite(result) ? result : 0;
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
        details: { code: formula.code, expression: formula.expression, target: formula.target_key },
      });
    });
  return { metrics, logs };
}
