import type { HumanRequest } from "../../src/model.js";
import type { ExecutionReport } from "./types.js";

export function evaluateScope(request: HumanRequest, report: ExecutionReport): string[] {
  const diagnostics: string[] = [];
  if (report.metrics.scopeViolations > 0) diagnostics.push(`O agente declarou ${report.metrics.scopeViolations} violação(ões) de escopo.`);
  for (const path of report.changedPaths ?? []) {
    if (request.scope.exclude.some((excluded) => path === excluded || path.startsWith(`${excluded}/`))) diagnostics.push(`Caminho proibido alterado: ${path}.`);
  }
  return diagnostics;
}
