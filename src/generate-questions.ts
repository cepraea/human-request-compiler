import type { Diagnostic } from "./model.js";

const questionByCode: Record<string, string> = {
  STRUCTURE_REQUIRED: "Qual informação obrigatória está faltando no campo indicado?",
  VAGUE_TERM: "Qual valor observável substituirá o termo vago?",
  UNRESOLVED_REFERENCE: "Qual é o nome, caminho, URL ou identificador exato do objeto?",
  NO_MANDATORY_ACCEPTANCE: "Qual condição obrigatória comprova que o resultado funciona?",
  ACCESS_NOT_CONFIRMED: "O agente possui acesso confirmado ao objeto e ao ambiente de validação?",
  PENDING_HUMAN_DECISION: "Qual decisão humana deve ser tomada antes da execução?",
  SCOPE_CONFLICT: "O item conflitante deve permanecer dentro ou fora do escopo?",
  AUTHORITY_CONFLICT: "A ação conflitante é autorizada à IA ou reservada ao humano?",
  SOURCE_CONFLICT: "A fonte conflitante é permitida ou proibida?"
};

export function generateQuestions(diagnostics: Diagnostic[]): string[] {
  return [...new Set(diagnostics.filter((item) => item.severity === "error").map((item) => questionByCode[item.code] ?? `Como resolver: ${item.message}`))];
}
