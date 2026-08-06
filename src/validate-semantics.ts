import type { Diagnostic, HumanRequest } from "./model.js";

export function validateSemantics(request: HumanRequest): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const mandatory = request.acceptanceCriteria.filter((criterion) => criterion.mandatory);
  if (mandatory.length === 0) diagnostics.push({ code: "NO_MANDATORY_ACCEPTANCE", severity: "error", path: "/acceptanceCriteria", message: "Não existe critério de aceitação obrigatório." });
  for (const [index, criterion] of request.acceptanceCriteria.entries()) {
    if (criterion.condition.trim() === criterion.expected.trim()) diagnostics.push({ code: "AC_CONDITION_EQUALS_EXPECTED", severity: "error", path: `/acceptanceCriteria/${index}`, message: "Condição e resultado esperado não podem ser idênticos." });
    if (!criterion.evidenceTypes?.length) diagnostics.push({ code: "AC_WITHOUT_EVIDENCE_TYPE", severity: "warning", path: `/acceptanceCriteria/${index}/evidenceTypes`, message: "O critério não declara o tipo de evidência esperado." });
  }
  if (!request.completion.doneWhen.some((item) => /crit[eé]rio|pass|aprov|evid[eê]ncia/iu.test(item))) diagnostics.push({ code: "WEAK_DONE_DEFINITION", severity: "error", path: "/completion/doneWhen", message: "A conclusão não está vinculada aos critérios ou às evidências." });
  if (request.delivery.evidenceRequired.length === 0) diagnostics.push({ code: "NO_DELIVERY_EVIDENCE", severity: "error", path: "/delivery/evidenceRequired", message: "A entrega precisa exigir evidências." });
  if (request.sources.allowed.includes(request.sources.canonical) === false) diagnostics.push({ code: "CANONICAL_NOT_ALLOWED", severity: "error", path: "/sources", message: "A fonte canônica também deve constar entre as fontes permitidas." });
  return diagnostics;
}
