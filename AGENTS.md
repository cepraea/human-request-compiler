# AGENTS.md

## Regra de entrada

Agentes somente podem executar pedidos cujo relatório do compilador declare `READY_FOR_EXECUTION`.

## Regra de evidência

Afirmações do agente executor não são evidência. Cada critério deve apontar para um teste, artefato, diff, log, hash ou observação humana identificável.

## Autoridade

A IA pode decidir detalhes técnicos reversíveis dentro do escopo autorizado. Aprovação, merge, publicação, exclusão de dados, aceitação de risco e mudanças de regra de negócio permanecem reservados ao humano indicado no pedido.

## Regra de encerramento

Não declarar sucesso quando houver critério obrigatório sem evidência, regressão, violação de escopo ou estado diferente de `EXECUTED_AND_VALIDATED`.
