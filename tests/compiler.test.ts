import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compileRequest } from "../src/compile-request.js";
import { generateGherkin } from "../src/generate-gherkin.js";
import { HumanRequestSchema } from "../src/model.js";

const fixture = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

describe("human request compiler", () => {
  it("libera um pedido completo", () => {
    const result = compileRequest(fixture("tests/valid/complete-request.json"));
    expect(result.state).toBe("READY_FOR_EXECUTION");
    expect(result.diagnostics.filter((item) => item.severity === "error")).toHaveLength(0);
  });

  it("bloqueia estrutura insuficiente", () =>
    expect(compileRequest(fixture("tests/insufficient/missing-acceptance.json")).state).toBe("INSUFFICIENT"));

  it("detecta contradição de escopo", () =>
    expect(compileRequest(fixture("tests/contradictory/scope-conflict.json")).state).toBe("CONTRADICTORY"));

  it("separa falta de acesso de insuficiência", () =>
    expect(compileRequest(fixture("tests/blocked/access-not-confirmed.json")).state).toBe("BLOCKED_BY_ACCESS"));

  it.each(["aceitar risco", "alterar regra de negócio"])(
    "impede que a ação sempre reservada %s seja autorizada à IA",
    (action) => {
      const request = HumanRequestSchema.parse(fixture("tests/valid/complete-request.json"));
      request.authority.authorizedActions.push(action);
      request.authority.reservedActions = request.authority.reservedActions.filter(
        (item) => !item.toLocaleLowerCase("pt-BR").includes(action.toLocaleLowerCase("pt-BR"))
      );

      const result = compileRequest(request);

      expect(result.state).toBe("NEEDS_HUMAN_DECISION");
      expect(result.diagnostics.map((item) => item.code)).toContain("ALWAYS_RESERVED_ACTION_AUTHORIZED");
      expect(result.diagnostics.map((item) => item.code)).toContain("ALWAYS_RESERVED_ACTION_NOT_RESERVED");
    }
  );

  it("gera Gherkin para todos os critérios", () => {
    const request = HumanRequestSchema.parse(fixture("tests/valid/complete-request.json"));
    const feature = generateGherkin(request);
    expect(feature).toContain("Funcionalidade:");
    expect(feature).toContain("AC-HRC-001");
    expect(feature).toContain("AC-HRC-002");
  });
});
