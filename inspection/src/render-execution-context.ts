import type { HumanRequest } from "../../src/model.js";
import type { RealityInspection } from "./model.js";

export interface ExecutionContext {
  schemaVersion: "1.0.0";
  requestId: string;
  inspectionId: string;
  targetRoot: string;
  targetHead?: string;
  authorizedPaths: string[];
  forbiddenPaths: string[];
  availableTools: string[];
  baseline: { id: string; success: boolean; output: string }[];
  acceptanceCommands: string[];
  stopConditions: string[];
  environmentFingerprint: string;
  state: "READY_FOR_EXECUTION";
}

export function renderExecutionContext(request: HumanRequest, report: RealityInspection): ExecutionContext {
  const context: ExecutionContext = {
    schemaVersion: "1.0.0",
    requestId: request.id,
    inspectionId: report.inspectionId,
    targetRoot: report.target.root,
    authorizedPaths: request.scope.include,
    forbiddenPaths: request.scope.exclude,
    availableTools: report.tools.filter((item) => item.available).map((item) => item.name),
    baseline: report.baseline.map((item) => ({ id: item.id, success: item.success, output: item.output })),
    acceptanceCommands: request.acceptanceCriteria.map((criterion) => criterion.verification),
    stopConditions: [...request.completion.failureWhen, ...request.authority.reservedActions.map((action) => `Interromper antes de: ${action}`)],
    environmentFingerprint: report.environmentFingerprint,
    state: "READY_FOR_EXECUTION"
  };
  if (report.git.head) context.targetHead = report.git.head;
  return context;
}
