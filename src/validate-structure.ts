import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { Diagnostic, HumanRequest } from "./model.js";
import { HumanRequestSchema } from "./model.js";
import { projectPath } from "./paths.js";

function loadJson(path: string): object {
  return JSON.parse(readFileSync(projectPath(path), "utf8")) as object;
}

export function validateStructure(value: unknown): { valid: boolean; diagnostics: Diagnostic[]; request?: HumanRequest } {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(loadJson("schemas/acceptance-criterion.schema.json"));
  ajv.addSchema(loadJson("schemas/authority.schema.json"));
  const validate = ajv.compile(loadJson("schemas/human-request.schema.json"));
  const valid = validate(value);
  const diagnostics: Diagnostic[] = (validate.errors ?? []).map((error) => ({
    code: `STRUCTURE_${error.keyword.toUpperCase()}`,
    severity: "error",
    path: error.instancePath || "/",
    message: error.message ?? "Estrutura inválida",
    suggestion: error.keyword === "required" ? `Preencha a propriedade ${(error.params as { missingProperty?: string }).missingProperty ?? "obrigatória"}.` : undefined
  }));
  if (!valid) return { valid: false, diagnostics };
  const parsed = HumanRequestSchema.safeParse(value);
  if (!parsed.success) {
    return {
      valid: false,
      diagnostics: parsed.error.issues.map((issue) => ({ code: "ZOD_VALIDATION", severity: "error", path: `/${issue.path.join("/")}`, message: issue.message }))
    };
  }
  return { valid: true, diagnostics: [], request: parsed.data };
}
