import type { HumanRequest } from "../../src/model.js";
import type { ExecutionReport } from "./types.js";

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\//, "").replace(/\/+$/, "");
}

function matchesRule(path: string, rule: string): boolean {
  const normalizedPath = normalizePath(path);
  const normalizedRule = normalizePath(rule);
  if (normalizedRule === "" || normalizedRule === "." || normalizedRule === "*") return true;
  return normalizedPath === normalizedRule || normalizedPath.startsWith(`${normalizedRule}/`);
}

export function evaluateScope(request: HumanRequest, report: ExecutionReport): string[] {
  const diagnostics: string[] = [];

  if (report.metrics.scopeViolations > 0) {
    diagnostics.push(`O agente declarou ${report.metrics.scopeViolations} violação(ões) de escopo.`);
  }

  for (const path of report.changedPaths ?? []) {
    const excluded = request.scope.exclude.some((rule) => matchesRule(path, rule));
    if (excluded) {
      diagnostics.push(`Caminho proibido alterado: ${path}.`);
      continue;
    }

    const included = request.scope.include.some((rule) => matchesRule(path, rule));
    if (!included) diagnostics.push(`Caminho alterado fora do escopo incluído: ${path}.`);
  }

  return diagnostics;
}
