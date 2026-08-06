import { createHash } from "node:crypto";
import { z } from "zod";

export const inspectionVerdicts = [
  "REQUEST_REALITY_MISMATCH",
  "BLOCKED_BY_ACCESS",
  "BLOCKED_BY_TOOLING",
  "BASELINE_UNSTABLE",
  "SOURCE_UNAVAILABLE",
  "READY_FOR_EXECUTION"
] as const;

export const InspectionEvidenceSchema = z.object({
  type: z.enum(["filesystem", "git", "tool", "baseline", "source", "scope"]),
  subject: z.string().min(1),
  observed: z.string().min(1),
  command: z.string().min(1).optional(),
  exitCode: z.number().int().optional()
});

export const CommandObservationSchema = z.object({
  id: z.string().min(1),
  command: z.string().min(1),
  args: z.array(z.string()),
  required: z.boolean(),
  success: z.boolean(),
  exitCode: z.number().int().nullable(),
  output: z.string()
});

export const RealityInspectionSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  inspectionId: z.string().min(1),
  requestId: z.string().regex(/^REQ-[A-Z0-9-]+$/),
  inspectedAt: z.string().datetime(),
  target: z.object({ root: z.string().min(1), exists: z.boolean(), readable: z.boolean(), writable: z.boolean() }),
  git: z.object({
    isRepository: z.boolean(),
    head: z.string().optional(),
    branch: z.string().optional(),
    dirty: z.boolean().optional(),
    expectedRef: z.string().optional(),
    expectedRefMatches: z.boolean().optional()
  }),
  tools: z.array(z.object({ name: z.string().min(1), command: z.string().min(1), available: z.boolean(), exitCode: z.number().int().nullable(), output: z.string() })),
  baseline: z.array(CommandObservationSchema),
  sources: z.array(z.object({ reference: z.string().min(1), local: z.boolean(), available: z.boolean().nullable() })),
  scope: z.array(z.object({ rule: z.string().min(1), kind: z.enum(["include", "exclude"]), local: z.boolean(), exists: z.boolean().nullable() })),
  evidence: z.array(InspectionEvidenceSchema),
  diagnostics: z.array(z.string()),
  environmentFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  verdict: z.enum(inspectionVerdicts)
});

export type RealityInspection = z.infer<typeof RealityInspectionSchema>;
export type InspectionVerdict = (typeof inspectionVerdicts)[number];
export type CommandObservation = z.infer<typeof CommandObservationSchema>;

export function calculateEnvironmentFingerprint(report: Omit<RealityInspection, "environmentFingerprint" | "inspectionId" | "inspectedAt">): string {
  const payload = {
    schemaVersion: report.schemaVersion,
    requestId: report.requestId,
    target: report.target,
    git: report.git,
    tools: report.tools,
    baseline: report.baseline,
    sources: report.sources,
    scope: report.scope,
    diagnostics: report.diagnostics,
    verdict: report.verdict
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function verifyEnvironmentFingerprint(report: RealityInspection): boolean {
  const { environmentFingerprint: _fingerprint, inspectionId: _inspectionId, inspectedAt: _inspectedAt, ...payload } = report;
  return calculateEnvironmentFingerprint(payload) === report.environmentFingerprint;
}
