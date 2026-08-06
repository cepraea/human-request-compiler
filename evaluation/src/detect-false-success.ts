import type { ExecutionReport } from "./types.js";
export function detectFalseSuccess(report: ExecutionReport): string[] {
  const diagnostics: string[] = [];
  if (report.metrics.falseSuccessDeclarations > 0) diagnostics.push(`Foram registradas ${report.metrics.falseSuccessDeclarations} declarações falsas de sucesso.`);
  if (report.agentDeclaredSuccess && report.validationResults.some((result) => result.status !== "PASS" || result.evidence.length === 0)) diagnostics.push("O agente declarou sucesso com critério não aprovado ou sem evidência.");
  return diagnostics;
}
