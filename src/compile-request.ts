import type { CompilationResult, Diagnostic, HumanRequest, RequestState } from "./model.js";
import { validateStructure } from "./validate-structure.js";
import { lintLanguage } from "./lint-language.js";
import { validateSemantics } from "./validate-semantics.js";
import { detectConflicts } from "./detect-conflicts.js";
import { detectHumanDecisions } from "./detect-human-decisions.js";
import { checkExecutability } from "./check-executability.js";
import { generateQuestions } from "./generate-questions.js";
import { generateGherkin } from "./generate-gherkin.js";
import { renderFinalRequest } from "./render-final-request.js";

function decideState(diagnostics: Diagnostic[]): RequestState {
  const errors = diagnostics.filter((item) => item.severity === "error");
  if (errors.some((item) => item.code.includes("CONFLICT") || item.code === "NO_STATE_TRANSITION")) return "CONTRADICTORY";
  if (
    errors.some(
      (item) =>
        item.code.includes("HUMAN_DECISION") ||
        item.code === "DESTRUCTIVE_ACTION_NOT_RESERVED" ||
        item.code.startsWith("ALWAYS_RESERVED_ACTION_")
    )
  ) return "NEEDS_HUMAN_DECISION";
  if (errors.some((item) => item.code.includes("ACCESS") || item.code === "OBJECT_LOCATION_UNKNOWN")) return "BLOCKED_BY_ACCESS";
  if (errors.length > 0) return "INSUFFICIENT";
  return "READY_FOR_EXECUTION";
}

export function compileRequest(value: unknown): CompilationResult {
  const structural = validateStructure(value);
  if (!structural.valid || !structural.request) {
    return { state: "INSUFFICIENT", diagnostics: structural.diagnostics, questions: generateQuestions(structural.diagnostics) };
  }
  const request: HumanRequest = structural.request;
  const diagnostics = [
    ...lintLanguage(request), ...validateSemantics(request), ...detectConflicts(request),
    ...detectHumanDecisions(request), ...checkExecutability(request)
  ];
  const state = decideState(diagnostics);
  const compiled = { ...request, state };
  return {
    request: compiled,
    state,
    diagnostics,
    questions: generateQuestions(diagnostics),
    gherkin: generateGherkin(compiled),
    renderedRequest: renderFinalRequest(compiled)
  };
}
