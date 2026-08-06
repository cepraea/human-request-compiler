import type { HumanRequest } from "../../src/model.js";
import { HumanRequestSchema } from "../../src/model.js";
import { compileRequest } from "../../src/compile-request.js";
import { RealityInspectionSchema, verifyEnvironmentFingerprint, type RealityInspection } from "./model.js";
import { renderExecutionContext, type ExecutionContext } from "./render-execution-context.js";

export interface PromotionResult {
  request: HumanRequest;
  context: ExecutionContext;
}

export function assertInspectionBinding(request: HumanRequest, report: RealityInspection): void {
  if (report.requestId !== request.id) throw new Error(`Relatório pertence a ${report.requestId}, não a ${request.id}.`);
  if (report.verdict !== "READY_FOR_EXECUTION") throw new Error(`Inspeção não liberou execução: ${report.verdict}.`);
  if (!verifyEnvironmentFingerprint(report)) throw new Error("Fingerprint do relatório de inspeção é inválido.");
}

export function promoteRequest(requestValue: unknown, reportValue: unknown, reportPath: string): PromotionResult {
  const request = HumanRequestSchema.parse(requestValue);
  const report = RealityInspectionSchema.parse(reportValue);
  const semantic = compileRequest(request);
  if (semantic.state !== "READY_FOR_FEASIBILITY_CHECK" || !semantic.request) {
    throw new Error(`Pedido não está semanticamente pronto: ${semantic.state}.`);
  }
  assertInspectionBinding(semantic.request, report);
  const promoted = HumanRequestSchema.parse({
    ...semantic.request,
    state: "READY_FOR_EXECUTION",
    feasibility: {
      inspectionId: report.inspectionId,
      reportPath,
      environmentFingerprint: report.environmentFingerprint,
      inspectedAt: report.inspectedAt
    }
  });
  return { request: promoted, context: renderExecutionContext(promoted, report) };
}
