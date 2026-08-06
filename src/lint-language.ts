import { readFileSync } from "node:fs";
import type { Diagnostic, HumanRequest } from "./model.js";
import { projectPath } from "./paths.js";

interface VagueRule { term: string; severity: "error" | "warning"; suggestion: string }

function textualFields(request: HumanRequest): Array<[string, string]> {
  return [
    ["/title", request.title], ["/objective/outcome", request.objective.outcome], ["/objective/purpose", request.objective.purpose],
    ["/currentState/problem", request.currentState.problem], ["/transformation/action", request.transformation.action],
    ["/transformation/from", request.transformation.from], ["/transformation/to", request.transformation.to],
    ...request.constraints.map((value, index) => [`/constraints/${index}`, value] as [string, string]),
    ...request.acceptanceCriteria.flatMap((criterion, index) => [
      [`/acceptanceCriteria/${index}/description`, criterion.description] as [string, string],
      [`/acceptanceCriteria/${index}/expected`, criterion.expected] as [string, string],
      [`/acceptanceCriteria/${index}/verification`, criterion.verification] as [string, string]
    ])
  ];
}

export function lintLanguage(request: HumanRequest): Diagnostic[] {
  const rules = JSON.parse(readFileSync(projectPath("rules/vague-terms.json"), "utf8")) as VagueRule[];
  const diagnostics: Diagnostic[] = [];
  for (const [path, value] of textualFields(request)) {
    for (const rule of rules) {
      const regex = new RegExp(`\\b${rule.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "iu");
      if (regex.test(value)) diagnostics.push({ code: "VAGUE_TERM", severity: rule.severity, path, message: `Termo potencialmente vago: “${rule.term}”.`, suggestion: rule.suggestion });
    }
    if (/\b(isso|aquilo|aquele arquivo|o anterior)\b/iu.test(value)) diagnostics.push({ code: "UNRESOLVED_REFERENCE", severity: "error", path, message: "Referência contextual sem identidade explícita.", suggestion: "Informe nome, caminho, URL ou identificador exato." });
  }
  return diagnostics;
}
