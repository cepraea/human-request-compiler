import type { HumanRequest } from "../../src/model.js";
import { HumanRequestSchema } from "../../src/model.js";
import { compileRequest } from "../../src/compile-request.js";
import { extractHumanRequest } from "../../src/extract-human-request.js";
import { RealityInspectionSchema, verifyEnvironmentFingerprint, type RealityInspection } from "./model.js";
import { renderExecutionContext, type ExecutionContext } from "./render-execution-context.js";

export interface PromotionResult {
  request: HumanRequest;
  context: ExecutionContext;
}

export interface PromotionOptions {
  now?: Date;
}

export function assertInspectionBinding(request: HumanRequest, report: RealityInspection, now: Date = new Date()): void {
  if (report.requestId !== request.id) throw new Error(`Relatório pertence a ${report.requestId}, não a ${request.id}.`);
  if (report.verdict !== "READY_FOR_EXECUTION") throw new Error(`Inspeção não liberou execução: ${report.verdict}.`);
  if (!verifyEnvironmentFingerprint(report)) throw new Error("Fingerprint ou inspectionId do relatório de inspeção é inválido.");

  const inspectedAt = new Date(report.inspectedAt);
  if (!Number.isFinite(inspectedAt.getTime())) throw new Error("Data de inspeção inválida.");
  const ageMs = now.getTime() - inspectedAt.getTime();
  if (ageMs < 0) throw new Error("Relatório de inspeção possui data futura.");
  const maximumMinutes = request.inspectionPlan?.maxReportAgeMinutes;
  if (maximumMinutes !== undefined && ageMs > maximumMinutes * 60_000) {
    throw new Error(`Relatório de inspeção expirado: limite de ${maximumMinutes} minuto(s).`);
  }
}

export function promoteRequest(requestValue: unknown, reportValue: unknown, reportPath: string, options: PromotionOptions = {}): PromotionResult {
  const request = HumanRequestSchema.parse(extractHumanRequest(requestValue));
  const report = RealityInspectionSchema.parse(reportValue);
  const semantic = compileRequest(request);
  if (semantic.state !== "READY_FOR_FEASIBILITY_CHECK" || !semantic.request) throw new Error(`Pedido não está semanticamente pronto: ${semantic.state}.`);
  assertInspectionBinding(semantic.request, report, options.now ?? new Date());
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
