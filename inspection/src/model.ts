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

export const RepositoryIdentitySchema = z.object({
  expected: z.string().min(1).optional(),
  actual: z.string().min(1).optional(),
  originUrl: z.string().min(1).optional(),
  matches: z.boolean().optional()
});

export const RealityInspectionSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  inspectionId: z.string().regex(/^INS-[A-F0-9]{24}$/),
  requestId: z.string().regex(/^REQ-[A-Z0-9-]+$/),
  inspectedAt: z.string().datetime(),
  target: z.object({ root: z.string().min(1), exists: z.boolean(), readable: z.boolean(), writable: z.boolean() }),
  repositoryIdentity: RepositoryIdentitySchema,
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
export type InspectionFingerprintPayload = Omit<RealityInspection, "environmentFingerprint" | "inspectionId">;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)])
    );
  }
  return value;
}

export function calculateEnvironmentFingerprint(report: InspectionFingerprintPayload): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(report)), "utf8").digest("hex");
}

export function inspectionIdFromFingerprint(fingerprint: string): string {
  return `INS-${fingerprint.slice(0, 24).toUpperCase()}`;
}

export function verifyEnvironmentFingerprint(report: RealityInspection): boolean {
  const { environmentFingerprint: _fingerprint, inspectionId: _inspectionId, ...payload } = report;
  const fingerprint = calculateEnvironmentFingerprint(payload);
  return fingerprint === report.environmentFingerprint && inspectionIdFromFingerprint(fingerprint) === report.inspectionId;
}
