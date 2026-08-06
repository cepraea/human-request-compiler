import type { Diagnostic, HumanRequest } from "./model.js";

export function checkExecutability(request: HumanRequest): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (!request.executability.accessConfirmed) diagnostics.push({ code: "ACCESS_NOT_CONFIRMED", severity: "error", path: "/executability/accessConfirmed", message: "O acesso ao objeto ou ambiente ainda não foi confirmado." });
  if (request.executability.requiredTools.length === 0) diagnostics.push({ code: "TOOLS_NOT_DECLARED", severity: "warning", path: "/executability/requiredTools", message: "Nenhuma ferramenta necessária foi declarada." });
  if (/^(a definir|desconhecido|n\/?a)$/iu.test(request.object.location.trim())) diagnostics.push({ code: "OBJECT_LOCATION_UNKNOWN", severity: "error", path: "/object/location", message: "A localização do objeto não está definida." });
  return diagnostics;
}
