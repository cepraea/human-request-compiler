# Human Request Compiler

O **Human Request Compiler (HRC)** transforma pedidos humanos em contratos verificáveis para agentes de IA e separa formalmente duas fronteiras:

1. **prontidão semântica** — o pedido é completo, consistente, verificável e possui autoridade definida;
2. **viabilidade real** — o ambiente foi inspecionado e comprovou que a execução é possível.

## Garantia operacional

O compilador semântico nunca promove diretamente para `READY_FOR_EXECUTION`. Um pedido válido recebe `READY_FOR_FEASIBILITY_CHECK`. A promoção somente ocorre depois de uma inspeção read-only produzir evidências objetivas e um fingerprint íntegro do ambiente.

```text
pedido humano
  → compilação semântica
  → READY_FOR_FEASIBILITY_CHECK
  → inspeção da realidade
  → relatório + fingerprint
  → promoção vinculada
  → READY_FOR_EXECUTION
```

`accessConfirmed: true` continua útil como declaração de entrada, mas não substitui inspeção do alvo.

## Estados de inspeção

- `READY_FOR_FEASIBILITY_CHECK`
- `INSPECTION_IN_PROGRESS`
- `REQUEST_REALITY_MISMATCH`
- `BLOCKED_BY_ACCESS`
- `BLOCKED_BY_TOOLING`
- `BASELINE_UNSTABLE`
- `SOURCE_UNAVAILABLE`
- `READY_FOR_EXECUTION`

## Uso local

```bash
npm ci
npm run compile -- request.json --out artifacts/compiled.json
npm run inspect -- artifacts/compiled.json /caminho/do/alvo --out artifacts/reality-inspection.json
npm run promote -- artifacts/compiled.json artifacts/reality-inspection.json \
  --report-path artifacts/reality-inspection.json \
  --out requests/ready/REQ-EXAMPLE.json \
  --context-out artifacts/execution-context.json
npm run validate:requests
```

A inspeção usa apenas Node.js, Git e comandos explicitamente declarados em `inspectionPlan`. Nenhuma API comercial de IA é necessária.

## Plano de inspeção

O pedido pode declarar:

- `expectedRef`: referência Git que deve corresponder ao `HEAD`;
- `requiredPaths`: caminhos cuja existência deve ser comprovada;
- `toolChecks`: comandos objetivos para verificar ferramentas;
- `baselineCommands`: comandos read-only de build, typecheck, lint ou testes;
- `maxReportAgeMinutes`: validade máxima do relatório.

Comandos são executados sem shell, reduzindo risco de expansão ou encadeamento acidental.

## Artefatos canônicos

- `inspection/schemas/reality-inspection.schema.json`
- `inspection/schemas/baseline-result.schema.json`
- `inspection/schemas/environment-fingerprint.schema.json`
- `inspection/schemas/execution-context.schema.json`
- pedido promovido com bloco `feasibility`

## Gate do GitHub

Arquivos em `requests/ready/*.json` só passam quando:

- o pedido recompila semanticamente para `READY_FOR_FEASIBILITY_CHECK`;
- declara `READY_FOR_EXECUTION` após promoção;
- aponta para um relatório de inspeção existente;
- `requestId`, `inspectionId`, data e fingerprint correspondem;
- o relatório possui veredito `READY_FOR_EXECUTION`;
- a idade máxima, quando declarada, não foi excedida.

Depois da execução, `evaluation/` verifica critérios de aceitação, evidências, regressões, violações de escopo, sucesso falso e eficiência operacional.
