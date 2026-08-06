import type { HumanRequest } from "../../src/model.js";
import type { Evidence, ExecutionReport } from "./types.js";

function matchesRequiredType(evidence: Evidence, requiredTypes: string[] | undefined): boolean {
  return !requiredTypes?.length || requiredTypes.includes(evidence.type);
}

export function evaluateAcceptance(
  request: HumanRequest,
  report: ExecutionReport
): { passRate: number; evidenceCoverage: number; diagnostics: string[] } {
  const mandatory = request.acceptanceCriteria.filter((criterion) => criterion.mandatory);
  const byId = new Map(report.validationResults.map((result) => [result.criterionId, result]));
  const passed = mandatory.filter((criterion) => byId.get(criterion.id)?.status === "PASS").length;
  const evidenced = mandatory.filter((criterion) => {
    const evidence = byId.get(criterion.id)?.evidence ?? [];
    return evidence.some((item) => matchesRequiredType(item, criterion.evidenceTypes));
  }).length;
  const diagnostics: string[] = [];

  for (const criterion of mandatory) {
    const result = byId.get(criterion.id);
    if (!result) {
      diagnostics.push(`${criterion.id}: resultado ausente.`);
      diagnostics.push(`${criterion.id}: evidência ausente.`);
      continue;
    }

    if (result.status !== "PASS") diagnostics.push(`${criterion.id}: estado ${result.status}.`);

    if (!result.evidence.length) {
      diagnostics.push(`${criterion.id}: evidência ausente.`);
      continue;
    }

    const hasRequiredType = result.evidence.some((item) =>
      matchesRequiredType(item, criterion.evidenceTypes)
    );
    if (!hasRequiredType && criterion.evidenceTypes?.length) {
      diagnostics.push(
        `${criterion.id}: evidência incompatível; tipo esperado: ${criterion.evidenceTypes.join(" ou ")}.`
      );
    }
  }

  return {
    passRate: mandatory.length ? passed / mandatory.length : 0,
    evidenceCoverage: mandatory.length ? evidenced / mandatory.length : 0,
    diagnostics
  };
}
