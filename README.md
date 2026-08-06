# Human Request Compiler

O **Human Request Compiler (HRC)** transforma pedidos humanos em contratos executáveis para agentes de IA. O projeto bloqueia pedidos estruturalmente incompletos, semanticamente contraditórios, sem autoridade definida, sem critérios verificáveis ou sem acesso confirmado.

## Garantia operacional

O HRC não promete que uma IA nunca falhará. Ele garante uma fronteira verificável:

> Nenhum pedido conhecido como insuficiente, contraditório, bloqueado ou dependente de decisão humana deve ser repassado ao agente executor como `READY_FOR_EXECUTION`.

Depois da execução, a camada `evaluation/` verifica critérios de aceitação, evidências, regressões, violações de escopo, declarações falsas de sucesso e eficiência operacional.

## Estados

- `DRAFT`
- `INSUFFICIENT`
- `NEEDS_HUMAN_DECISION`
- `CONTRADICTORY`
- `READY_FOR_FEASIBILITY_CHECK`
- `BLOCKED_BY_ACCESS`
- `READY_FOR_EXECUTION`
- `EXECUTION_IN_PROGRESS`
- `EXECUTED_NOT_VALIDATED`
- `VALIDATION_IN_PROGRESS`
- `VALIDATION_FAILED`
- `NEEDS_HUMAN_ACCEPTANCE`
- `EXECUTED_AND_VALIDATED`
- `ACCEPTED`
- `REJECTED`

## Uso local

```bash
npm install
npm run gate
npm run compile -- tests/valid/complete-request.json --out artifacts/compiled.json
npm run validate -- artifacts/compiled.json
npm run evaluate -- tests/valid/complete-request.json evaluation/fixtures/passed/execution-report.json
```

## Aplicação web

```bash
npm run --workspace web dev
```

A aplicação JSON Forms funciona localmente e não chama APIs comerciais de IA. O JSON compilado pode ser copiado para ChatGPT ou Gemini no navegador, ou salvo no repositório para Claude Code e Codex no VS Code.

## Gate do GitHub

Pedidos destinados aos agentes devem ser salvos em `requests/ready/*.json`. O workflow `.github/workflows/validate-ai-request.yml` falha quando qualquer arquivo dessa pasta não compila exatamente para `READY_FOR_EXECUTION`.

O Issue Form recebe um pedido canônico produzido pela CLI ou pela aplicação web. O workflow de Issues valida o JSON e registra o veredito no resumo da execução. Para enforcement completo, configure a proteção da branch `main` exigindo o check `request-gate` antes do merge.

## Sem API obrigatória

O núcleo usa apenas TypeScript, Zod, JSON Schema, Ajv, JSON Forms, testes locais e GitHub Actions. Integrações com modelos comerciais são opcionais e não fazem parte do gate determinístico.

## Estrutura

- `schemas/`: contratos JSON canônicos.
- `src/`: parser, compilador, diagnósticos, CLI e gates.
- `rules/`: regras linguísticas, de autoridade, domínio e destrutividade.
- `web/`: aplicação JSON Forms.
- `tests/`: fixtures e testes de estado.
- `evaluation/`: auditoria posterior do agente.
- `requests/`: pedidos em elaboração e pedidos liberados.
