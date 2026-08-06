import { z } from "zod";
import { HumanRequestSchema, requestStates, type HumanRequest } from "./model.js";

const CompilationArtifactSchema = z.object({
  request: HumanRequestSchema,
  state: z.enum(requestStates),
  diagnostics: z.array(z.unknown()),
  questions: z.array(z.string())
}).passthrough();

export function extractHumanRequest(value: unknown): HumanRequest {
  const direct = HumanRequestSchema.safeParse(value);
  if (direct.success) return direct.data;

  const compiled = CompilationArtifactSchema.parse(value);
  if (compiled.state !== "READY_FOR_FEASIBILITY_CHECK") {
    throw new Error(`Artefato compilado não está pronto para inspeção: ${compiled.state}.`);
  }
  if (compiled.request.state !== "READY_FOR_FEASIBILITY_CHECK") {
    throw new Error(`Pedido contido no artefato não está pronto para inspeção: ${compiled.request.state ?? "sem estado"}.`);
  }
  return compiled.request;
}
