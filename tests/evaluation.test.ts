import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateExecution } from "../evaluation/src/evaluate-execution.js";

const json = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
const request = json("tests/valid/complete-request.json");

describe("avaliação posterior", () => {
  it("aprova execução funcional com evidência integral", () => expect(evaluateExecution(request, json("evaluation/fixtures/passed/execution-report.json")).status).toBe("EXECUTED_AND_VALIDATED"));
  it("reprova critério falho", () => expect(evaluateExecution(request, json("evaluation/fixtures/failed/execution-report.json")).status).toBe("VALIDATION_FAILED"));
  it("mede ineficiência separadamente da validade", () => {
    const result = evaluateExecution(request, json("evaluation/fixtures/inefficient/execution-report.json"));
    expect(result.status).toBe("EXECUTED_AND_VALIDATED");
    expect(result.efficiencyClass).toBe("SEVERELY_INEFFICIENT");
  });
  it("detecta sucesso falso", () => expect(evaluateExecution(request, json("evaluation/fixtures/false-success/execution-report.json")).status).toBe("VALIDATION_FAILED"));
});
