export type Evidence = { type: "test-result" | "log" | "diff" | "hash" | "screenshot" | "human-observation" | "artifact"; location: string; description: string; sha256?: string };
export type ValidationResult = { criterionId: string; status: "PASS" | "FAIL" | "NOT_EVALUATED"; evidence: Evidence[] };
export type PerformanceMetrics = { attempts: number; humanInterventions: number; unjustifiedHumanInterventions: number; scopeViolations: number; regressions: number; falseSuccessDeclarations: number };
export type ExecutionReport = { requestId: string; agent: string; executionId: string; validationResults: ValidationResult[]; metrics: PerformanceMetrics; changedPaths?: string[]; requiresHumanAcceptance: boolean; agentDeclaredSuccess?: boolean };
export type EvaluationStatus = "VALIDATION_FAILED" | "EVIDENCE_INSUFFICIENT" | "SCOPE_VIOLATION" | "REGRESSION_DETECTED" | "NEEDS_HUMAN_ACCEPTANCE" | "EXECUTED_AND_VALIDATED";
export type EvaluationResult = { status: EvaluationStatus; acceptancePassRate: number; evidenceCoverage: number; efficiencyScore: number; efficiencyClass: "EXCELLENT" | "ACCEPTABLE" | "INEFFICIENT" | "SEVERELY_INEFFICIENT"; diagnostics: string[] };
