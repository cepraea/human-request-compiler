import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateExecution } from "../evaluation/src/evaluate-execution.js";
import type { Evidence, ExecutionReport } from "../evaluation/src/types.js";

const json = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
const request = json("tests/valid/complete-request.json");
const validReport = (): ExecutionReport =>
  structuredClone(json("evaluation/fixtures/passed/execution-report.json")) as ExecutionReport;

describe("avaliação posterior", () => {
  it("aprova execução funcional com evidência integral", () =>
    expect(evaluateExecution(request, validReport()).status).toBe("EXECUTED_AND_VALIDATED"));

  it("reprova critério falho", () =>
    expect(evaluateExecution(request, json("evaluation/fixtures/failed/execution-report.json")).status).toBe(
      "VALIDATION_FAILED"
    ));

  it("mede ineficiência separadamente da validade", () => {
    const result = evaluateExecution(
      request,
      json("evaluation/fixtures/inefficient/execution-report.json")
    );
    expect(result.status).toBe("EXECUTED_AND_VALIDATED");
    expect(result.efficiencyClass).toBe("SEVERELY_INEFFICIENT");
  });

  it("detecta sucesso falso", () =>
    expect(evaluateExecution(request, json("evaluation/fixtures/false-success/execution-report.json")).status).toBe(
      "VALIDATION_FAILED"
    ));

  it("rejeita evidência estruturalmente inválida antes da avaliação", () => {
    const report = validReport();
    report.validationResults[0]!.evidence = [{} as never];
    expect(() => evaluateExecution(request, report)).toThrow(/Relatório de execução inválido/);
  });

  it("rejeita relatório vinculado a outro pedido", () => {
    const report = validReport();
    report.requestId = "REQ-OUTRO-001";
    expect(() => evaluateExecution(request, report)).toThrow(/não corresponde ao pedido avaliado/);
  });

  it("detecta caminho alterado fora do escopo incluído", () => {
    const report = validReport();
    report.changedPaths = ["README.md"];
    const result = evaluateExecution(request, report);
    expect(result.status).toBe("SCOPE_VIOLATION");
    expect(result.diagnostics).toContain("Caminho alterado fora do escopo incluído: README.md.");
  });

  it("exige o tipo de evidência declarado pelo critério", () => {
    const report = validReport();
    const incompatibleEvidence: Evidence = {
      type: "log",
      location: "artifacts/execution.log",
      description: "Log válido, mas não é o resultado de teste exigido."
    };
    report.validationResults[0]!.evidence = [incompatibleEvidence];

    const result = evaluateExecution(request, report);

    expect(result.status).toBe("EVIDENCE_INSUFFICIENT");
    expect(result.evidenceCoverage).toBe(0.5);
    expect(result.diagnostics).toContain(
      "AC-HRC-001: evidência incompatível; tipo esperado: test-result."
    );
  });
});
