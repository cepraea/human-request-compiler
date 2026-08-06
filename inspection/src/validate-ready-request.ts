import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Diagnostic, HumanRequest } from "../../src/model.js";
import { HumanRequestSchema } from "../../src/model.js";
import { compileRequest } from "../../src/compile-request.js";
import { RealityInspectionSchema } from "./model.js";
import { assertInspectionBinding } from "./promote-request.js";

export interface ReadyValidationResult {
  valid: boolean;
  diagnostics: Diagnostic[];
  request?: HumanRequest;
}

export async function validateReadyRequest(value: unknown, baseDirectory = process.cwd()): Promise<ReadyValidationResult> {
  const parsed = HumanRequestSchema.safeParse(value);
  if (!parsed.success) {
    return {
      valid: false,
      diagnostics: parsed.error.issues.map((issue) => ({ code: "READY_STRUCTURE_INVALID", severity: "error", path: `/${issue.path.join("/")}`, message: issue.message }))
    };
  }
  const request = parsed.data;
  const diagnostics: Diagnostic[] = [];
  if (request.state !== "READY_FOR_EXECUTION") diagnostics.push({ code: "READY_STATE_INVALID", severity: "error", path: "/state", message: "Pedido promovido deve declarar READY_FOR_EXECUTION." });
  if (!request.feasibility) diagnostics.push({ code: "FEASIBILITY_BINDING_MISSING", severity: "error", path: "/feasibility", message: "Pedido READY_FOR_EXECUTION precisa estar vinculado a uma inspeção." });

  const semantic = compileRequest(request);
  if (semantic.state !== "READY_FOR_FEASIBILITY_CHECK") diagnostics.push({ code: "SEMANTIC_GATE_FAILED", severity: "error", path: "/", message: `A recompilação semântica resultou em ${semantic.state}.` });
  if (!request.feasibility) return { valid: false, diagnostics };

  try {
    const path = resolve(baseDirectory, request.feasibility.reportPath);
    const report = RealityInspectionSchema.parse(JSON.parse(await readFile(path, "utf8")) as unknown);
    assertInspectionBinding(request, report);
    if (report.inspectionId !== request.feasibility.inspectionId) throw new Error("inspectionId divergente.");
    if (report.environmentFingerprint !== request.feasibility.environmentFingerprint) throw new Error("environmentFingerprint divergente.");
    if (report.inspectedAt !== request.feasibility.inspectedAt) throw new Error("inspectedAt divergente.");
    const maxAge = request.inspectionPlan?.maxReportAgeMinutes;
    if (maxAge !== undefined && Date.now() - Date.parse(report.inspectedAt) > maxAge * 60_000) throw new Error(`Relatório excedeu a idade máxima de ${maxAge} minuto(s).`);
  } catch (error) {
    diagnostics.push({ code: "FEASIBILITY_EVIDENCE_INVALID", severity: "error", path: "/feasibility/reportPath", message: error instanceof Error ? error.message : String(error) });
  }

  return diagnostics.some((item) => item.severity === "error") ? { valid: false, diagnostics } : { valid: true, diagnostics, request };
}
