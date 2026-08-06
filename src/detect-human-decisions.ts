import { readFileSync } from "node:fs";
import type { Diagnostic, HumanRequest } from "./model.js";
import { projectPath } from "./paths.js";

type AuthorityRules = {
  alwaysReserved: string[];
  requiresNamedApprover: boolean;
  destructiveActionsRequireApproval: boolean;
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

function containsTerm(value: string, term: string): boolean {
  return normalize(value).includes(normalize(term));
}

export function detectHumanDecisions(request: HumanRequest): Diagnostic[] {
  const diagnostics: Diagnostic[] = request.pendingHumanDecisions.map((decision, index) => ({
    code: "PENDING_HUMAN_DECISION",
    severity: "error",
    path: `/pendingHumanDecisions/${index}`,
    message: decision
  }));

  const authorityRules = JSON.parse(
    readFileSync(projectPath("rules/authority-rules.json"), "utf8")
  ) as AuthorityRules;
  const destructive = JSON.parse(
    readFileSync(projectPath("rules/destructive-actions.json"), "utf8")
  ) as string[];

  const actionSources = [
    { path: "/transformation/action", value: request.transformation.action, authorized: false },
    ...request.authority.authorizedActions.map((value, index) => ({
      path: `/authority/authorizedActions/${index}`,
      value,
      authorized: true
    }))
  ];

  for (const term of authorityRules.alwaysReserved) {
    const matchingSources = actionSources.filter((source) => containsTerm(source.value, term));
    if (matchingSources.length === 0) continue;

    const isReserved = request.authority.reservedActions.some((item) => containsTerm(item, term));

    for (const source of matchingSources.filter((item) => item.authorized)) {
      diagnostics.push({
        code: "ALWAYS_RESERVED_ACTION_AUTHORIZED",
        severity: "error",
        path: source.path,
        message: `A ação “${term}” é sempre reservada ao humano e não pode constar em authorizedActions.`
      });
    }

    if (!isReserved) {
      diagnostics.push({
        code: "ALWAYS_RESERVED_ACTION_NOT_RESERVED",
        severity: "error",
        path: "/authority/reservedActions",
        message: `A ação “${term}” deve constar em reservedActions e permanecer sob aprovação humana.`
      });
    }
  }

  const actionText = actionSources.map((source) => source.value).join(" ");
  for (const term of destructive) {
    const coveredByAlwaysReserved = authorityRules.alwaysReserved.some(
      (reservedTerm) => normalize(reservedTerm) === normalize(term)
    );
    if (coveredByAlwaysReserved) continue;

    if (
      containsTerm(actionText, term) &&
      !request.authority.reservedActions.some((item) => containsTerm(item, term))
    ) {
      diagnostics.push({
        code: "DESTRUCTIVE_ACTION_NOT_RESERVED",
        severity: "error",
        path: "/authority/reservedActions",
        message: `A ação destrutiva “${term}” deve permanecer reservada à aprovação humana.`
      });
    }
  }

  return diagnostics;
}
