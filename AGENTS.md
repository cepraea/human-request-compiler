# AGENTS.md

## Regra de entrada

O compilador semântico somente pode produzir `READY_FOR_FEASIBILITY_CHECK`. Agentes executores somente podem atuar sobre pedidos promovidos para `READY_FOR_EXECUTION` que contenham vínculo `feasibility` válido com um `reality-inspection.json` íntegro e de veredito `READY_FOR_EXECUTION`.

`accessConfirmed: true` é declaração humana, não evidência suficiente de viabilidade.

## Regra de inspeção

A inspeção é read-only e deve comprovar, com evidências identificáveis, a identidade do alvo, acesso, referência Git quando aplicável, ferramentas, fontes locais, caminhos obrigatórios e baseline. Incompatibilidades devem bloquear a promoção.

## Regra de evidência

Afirmações do agente executor não são evidência. Cada critério deve apontar para um teste, artefato, diff, log, hash ou observação humana identificável.

## Autoridade

A IA pode decidir detalhes técnicos reversíveis dentro do escopo autorizado. Aprovação, merge, publicação, exclusão de dados, aceitação de risco e mudanças de regra de negócio permanecem reservados ao humano indicado no pedido.

## Regra de encerramento

Não declarar sucesso quando houver critério obrigatório sem evidência, regressão, violação de escopo, fingerprint inválido ou estado diferente de `EXECUTED_AND_VALIDATED`.
