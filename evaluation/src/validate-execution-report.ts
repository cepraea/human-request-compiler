import { readFileSync } from "node:fs";
import Ajv2020, { type ErrorObject } from "ajv/dist/2020.js";
import type { ExecutionReport } from "./types.js";
import { projectPath } from "../../src/paths.js";

function loadJson(path: string): object {
  return JSON.parse(readFileSync(projectPath(path), "utf8")) as object;
}

function formatError(error: ErrorObject): string {
  const path = error.instancePath || "/";
  if (error.keyword === "required") {
    const missing = (error.params as { missingProperty?: string }).missingProperty ?? "propriedade obrigatória";
    return `${path}: propriedade ausente ${missing}`;
  }
  return `${path}: ${error.message ?? "valor inválido"}`;
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addSchema(loadJson("evaluation/schemas/evidence.schema.json"));
ajv.addSchema(loadJson("evaluation/schemas/validation-result.schema.json"));
ajv.addSchema(loadJson("evaluation/schemas/performance-metrics.schema.json"));
const validateReport = ajv.compile(loadJson("evaluation/schemas/execution-report.schema.json"));

export function parseExecutionReport(value: unknown): ExecutionReport {
  if (!validateReport(value)) {
    const details = (validateReport.errors ?? []).map(formatError).join("; ");
    throw new Error(`Relatório de execução inválido: ${details || "estrutura incompatível"}.`);
  }
  return value as ExecutionReport;
}
