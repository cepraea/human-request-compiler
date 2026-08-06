import type { HumanRequest } from "./model.js";

const list = (items: string[]) => items.map((item) => `- ${item}`).join("\n") || "- Nenhum";

export function renderFinalRequest(request: HumanRequest): string {
  return `# ${request.id} — ${request.title}

## Objetivo
${request.objective.outcome}

**Finalidade:** ${request.objective.purpose}
**Prioridade:** ${request.objective.priority}

## Objeto
- Tipo: ${request.object.type}
- Nome: ${request.object.name}
- Localização: ${request.object.location}

## Estado atual
${request.currentState.problem}

### Evidências
${list(request.currentState.evidence)}

## Transformação
- Ação: ${request.transformation.action}
- De: ${request.transformation.from}
- Para: ${request.transformation.to}

## Escopo permitido
${list(request.scope.include)}

## Escopo proibido
${list(request.scope.exclude)}

## Restrições
${list(request.constraints)}

## Critérios de aceitação
${request.acceptanceCriteria.map((criterion) => `### ${criterion.id}
${criterion.description}
- Condição: ${criterion.condition}
- Esperado: ${criterion.expected}
- Verificação: ${criterion.verification}
- Obrigatório: ${criterion.mandatory ? "sim" : "não"}`).join("\n\n")}

## Autoridade
- Executor: ${request.authority.executor}
- Aprovador: ${request.authority.approver}
- Ações autorizadas:
${list(request.authority.authorizedActions)}
- Ações reservadas:
${list(request.authority.reservedActions)}

## Definition of Done
${list(request.completion.doneWhen)}
`;
}
