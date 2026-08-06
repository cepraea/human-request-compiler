import type { HumanRequest } from "../../src/model.js";
import type { ExecutionReport } from "./types.js";

export function evaluateAcceptance(request: HumanRequest, report: ExecutionReport): { passRate: number; evidenceCoverage: number; diagnostics: string[] } {
  const mandatory = request.acceptanceCriteria.filter((criterion) => criterion.mandatory);
  const byId = new Map(report.validationResults.map((result) => [result.criterionId, result]));
  const passed = mandatory.filter((criterion) => byId.get(criterion.id)?.status === "PASS").length;
  const evidenced = mandatory.filter((criterion) => (byId.get(criterion.id)?.evidence.length ?? 0) > 0).length;
  const diagnostics: string[] = [];
  for (const criterion of mandatory) {
    const result = byId.get(criterion.id);
    if (!result) diagnostics.push(`${criterion.id}: resultado ausente.`);
    else if (result.status !== "PASS") diagnostics.push(`${criterion.id}: estado ${result.status}.`);
    if (!result?.evidence.length) diagnostics.push(`${criterion.id}: evidência ausente.`);
  }
  return { passRate: mandatory.length ? passed / mandatory.length : 0, evidenceCoverage: mandatory.length ? evidenced / mandatory.length : 0, diagnostics };
}
