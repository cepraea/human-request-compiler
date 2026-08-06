import type { HumanRequest } from "./model.js";

function clean(value: string): string { return value.replace(/\r?\n/g, " ").trim(); }

export function generateGherkin(request: HumanRequest): string {
  const scenarios = request.acceptanceCriteria.map((criterion) => [
    `  Cenário: ${criterion.id} — ${clean(criterion.description)}`,
    `    Dado ${clean(criterion.condition)}`,
    `    Quando a transformação “${clean(request.transformation.action)}” for executada`,
    `    Então ${clean(criterion.expected)}`,
    `    E a verificação será “${clean(criterion.verification)}”`
  ].join("\n")).join("\n\n");
  return `# language: pt\nFuncionalidade: ${clean(request.title)}\n  Para ${clean(request.objective.purpose)}\n  Como autoridade ${clean(request.authority.approver)}\n  Quero ${clean(request.objective.outcome)}\n\n${scenarios}\n`;
}
