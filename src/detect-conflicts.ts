import type { Diagnostic, HumanRequest } from "./model.js";

const normalize = (value: string) => value.trim().toLocaleLowerCase("pt-BR");

function overlaps(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map(normalize));
  return left.filter((item) => rightSet.has(normalize(item)));
}

export function detectConflicts(request: HumanRequest): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const item of overlaps(request.scope.include, request.scope.exclude)) diagnostics.push({ code: "SCOPE_CONFLICT", severity: "error", path: "/scope", message: `O mesmo item está incluído e excluído do escopo: ${item}.` });
  for (const item of overlaps(request.authority.authorizedActions, request.authority.reservedActions)) diagnostics.push({ code: "AUTHORITY_CONFLICT", severity: "error", path: "/authority", message: `A ação está simultaneamente autorizada e reservada: ${item}.` });
  for (const item of overlaps(request.sources.allowed, request.sources.forbidden)) diagnostics.push({ code: "SOURCE_CONFLICT", severity: "error", path: "/sources", message: `A fonte está simultaneamente permitida e proibida: ${item}.` });
  if (normalize(request.transformation.from) === normalize(request.transformation.to)) diagnostics.push({ code: "NO_STATE_TRANSITION", severity: "error", path: "/transformation", message: "Os estados inicial e final são equivalentes." });
  return diagnostics;
}
