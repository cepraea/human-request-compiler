import { readFileSync } from "node:fs";
import type { Diagnostic, HumanRequest } from "./model.js";
import { projectPath } from "./paths.js";

export function detectHumanDecisions(request: HumanRequest): Diagnostic[] {
  const diagnostics: Diagnostic[] = request.pendingHumanDecisions.map((decision, index) => ({
    code: "PENDING_HUMAN_DECISION", severity: "error", path: `/pendingHumanDecisions/${index}`, message: decision
  }));
  const destructive = JSON.parse(readFileSync(projectPath("rules/destructive-actions.json"), "utf8")) as string[];
  const actionText = [request.transformation.action, ...request.authority.authorizedActions].join(" ").toLocaleLowerCase("pt-BR");
  for (const term of destructive) {
    if (actionText.includes(term.toLocaleLowerCase("pt-BR")) && !request.authority.reservedActions.some((item) => item.toLocaleLowerCase("pt-BR").includes(term.toLocaleLowerCase("pt-BR")))) {
      diagnostics.push({ code: "DESTRUCTIVE_ACTION_NOT_RESERVED", severity: "error", path: "/authority/reservedActions", message: `A ação destrutiva “${term}” deve permanecer reservada à aprovação humana.` });
    }
  }
  return diagnostics;
}
