import { z } from "zod";

export const requestStates = [
  "DRAFT", "INSUFFICIENT", "NEEDS_HUMAN_DECISION", "CONTRADICTORY",
  "READY_FOR_FEASIBILITY_CHECK", "BLOCKED_BY_ACCESS", "READY_FOR_EXECUTION",
  "EXECUTION_IN_PROGRESS", "EXECUTED_NOT_VALIDATED", "VALIDATION_IN_PROGRESS",
  "VALIDATION_FAILED", "NEEDS_HUMAN_ACCEPTANCE", "EXECUTED_AND_VALIDATED",
  "ACCEPTED", "REJECTED"
] as const;

export type RequestState = (typeof requestStates)[number];

export const AcceptanceCriterionSchema = z.object({
  id: z.string().regex(/^AC-[A-Z0-9-]+$/),
  description: z.string().min(10),
  condition: z.string().min(5),
  expected: z.string().min(5),
  verification: z.string().min(5),
  mandatory: z.boolean(),
  environment: z.string().min(2).optional(),
  evidenceTypes: z.array(z.string().min(2)).optional()
});

export const AuthoritySchema = z.object({
  executor: z.string().min(2),
  approver: z.string().min(2),
  authorizedActions: z.array(z.string().min(2)).min(1),
  reservedActions: z.array(z.string().min(2)),
  destructiveActionsRequireApproval: z.literal(true)
});

export const HumanRequestSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  id: z.string().regex(/^REQ-[A-Z0-9-]+$/),
  title: z.string().min(8),
  objective: z.object({ outcome: z.string().min(10), purpose: z.string().min(10), priority: z.string().min(3) }),
  object: z.object({ type: z.string().min(2), name: z.string().min(2), location: z.string().min(2) }),
  currentState: z.object({ problem: z.string().min(10), evidence: z.array(z.string().min(3)).min(1) }),
  transformation: z.object({ action: z.string().min(3), from: z.string().min(3), to: z.string().min(3) }),
  expectedState: z.object({ artifact: z.string().min(3), behaviors: z.array(z.string().min(5)).min(1), mustNotHappen: z.array(z.string().min(5)) }),
  sources: z.object({ canonical: z.string().min(3), allowed: z.array(z.string().min(2)).min(1), forbidden: z.array(z.string().min(2)), conflictRule: z.string().min(10) }),
  scope: z.object({ include: z.array(z.string().min(2)).min(1), exclude: z.array(z.string().min(2)) }),
  constraints: z.array(z.string().min(5)).min(1),
  acceptanceCriteria: z.array(AcceptanceCriterionSchema).min(1),
  authority: AuthoritySchema,
  delivery: z.object({ format: z.string().min(2), location: z.string().min(2), evidenceRequired: z.array(z.string().min(2)).min(1) }),
  completion: z.object({ doneWhen: z.array(z.string().min(5)).min(1), failureWhen: z.array(z.string().min(5)).min(1) }),
  executability: z.object({ environment: z.string().min(2), requiredTools: z.array(z.string().min(2)), accessConfirmed: z.boolean() }),
  pendingHumanDecisions: z.array(z.string().min(3)),
  state: z.enum(requestStates).optional()
});

export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterionSchema>;
export type Authority = z.infer<typeof AuthoritySchema>;
export type HumanRequest = z.infer<typeof HumanRequestSchema>;

export type Severity = "error" | "warning";
export interface Diagnostic {
  code: string;
  severity: Severity;
  path: string;
  message: string;
  suggestion?: string;
}

export interface CompilationResult {
  request?: HumanRequest;
  state: RequestState;
  diagnostics: Diagnostic[];
  questions: string[];
  gherkin?: string;
  renderedRequest?: string;
}
