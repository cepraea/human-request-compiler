import { HumanRequestSchema } from "../../src/model.js";
import { evaluateAcceptance } from "./evaluate-acceptance.js";
import { evaluateScope } from "./evaluate-scope.js";
import { evaluateRegressions } from "./evaluate-regressions.js";
import { detectFalseSuccess } from "./detect-false-success.js";
import { classifyEfficiency, evaluateEfficiency } from "./evaluate-efficiency.js";
import type { EvaluationResult, ExecutionReport } from "./types.js";

function parseReport(value: unknown): ExecutionReport {
  if (!value || typeof value !== "object") throw new Error("Relatório de execução inválido.");
  return value as ExecutionReport;
}

export function evaluateExecution(requestValue: unknown, reportValue: unknown): EvaluationResult {
  const request = HumanRequestSchema.parse(requestValue);
  const report = parseReport(reportValue);
  const acceptance = evaluateAcceptance(request, report);
  const scope = evaluateScope(request, report);
  const regressions = evaluateRegressions(report);
  const falseSuccess = detectFalseSuccess(report);
  const diagnostics = [...acceptance.diagnostics, ...scope, ...regressions, ...falseSuccess];
  const score = evaluateEfficiency(report.metrics);
  let status: EvaluationResult["status"] = "EXECUTED_AND_VALIDATED";
  if (scope.length) status = "SCOPE_VIOLATION";
  else if (regressions.length) status = "REGRESSION_DETECTED";
  else if (acceptance.passRate < 1) status = "VALIDATION_FAILED";
  else if (acceptance.evidenceCoverage < 1 || falseSuccess.length) status = "EVIDENCE_INSUFFICIENT";
  else if (report.requiresHumanAcceptance) status = "NEEDS_HUMAN_ACCEPTANCE";
  return { status, acceptancePassRate: acceptance.passRate, evidenceCoverage: acceptance.evidenceCoverage, efficiencyScore: score, efficiencyClass: classifyEfficiency(score), diagnostics };
}
