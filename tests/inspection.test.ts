import { readFileSync } from "node:fs";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { compileRequest } from "../src/compile-request.js";
import { HumanRequestSchema, type HumanRequest } from "../src/model.js";
import { inspectReality } from "../inspection/src/inspect-reality.js";
import { promoteRequest } from "../inspection/src/promote-request.js";
import { verifyEnvironmentFingerprint } from "../inspection/src/model.js";

const roots: string[] = [];
const fixture = (): HumanRequest => HumanRequestSchema.parse(JSON.parse(readFileSync("tests/valid/complete-request.json", "utf8")) as unknown);

async function target(origin = "https://github.com/cepraea/human-request-compiler.git"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "hrc-inspection-"));
  roots.push(root);
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "src", "index.ts"), "export const ready = true;\n");
  for (const args of [["init"], ["config", "user.email", "test@example.com"], ["config", "user.name", "HRC Test"], ["remote", "add", "origin", origin], ["add", "."], ["commit", "-m", "baseline"]]) {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  }
  return root;
}

function prepared(baselineExit = 0, requiredPaths = ["src"]): HumanRequest {
  const request = fixture();
  request.object.name = "cepraea/human-request-compiler";
  request.object.location = "https://github.com/cepraea/human-request-compiler";
  request.scope.include = ["src"];
  request.scope.exclude = ["outside"];
  request.sources.canonical = "src";
  request.sources.allowed = ["src"];
  request.executability.requiredTools = ["node"];
  request.inspectionPlan = {
    expectedRef: "HEAD",
    requiredPaths,
    toolChecks: [{ name: "node", command: process.execPath, args: ["--version"] }],
    baselineCommands: [{ id: "baseline", command: process.execPath, args: ["-e", `process.exit(${baselineExit})`] }],
    maxReportAgeMinutes: 30
  };
  return request;
}

afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("reality inspection gate", () => {
  it("consome o artefato produzido por compile e promove após inspeção válida", async () => {
    const root = await target();
    const compiled = compileRequest(prepared());
    expect(compiled.state).toBe("READY_FOR_FEASIBILITY_CHECK");
    const report = await inspectReality(compiled.request, root, new Date("2026-08-06T12:00:00.000Z"));
    expect(report.verdict).toBe("READY_FOR_EXECUTION");
    const promoted = promoteRequest(compiled, report, "inspection/reality-inspection.json", { now: new Date("2026-08-06T12:10:00.000Z") });
    expect(promoted.request.state).toBe("READY_FOR_EXECUTION");
    expect(promoted.request.feasibility?.environmentFingerprint).toBe(report.environmentFingerprint);
    expect(promoted.context.state).toBe("READY_FOR_EXECUTION");
  });

  it("bloqueia baseline instável", async () => {
    const root = await target();
    const compiled = compileRequest(prepared(2));
    const report = await inspectReality(compiled.request, root);
    expect(report.verdict).toBe("BASELINE_UNSTABLE");
    expect(() => promoteRequest(compiled, report, "inspection/report.json")).toThrow(/não liberou execução/u);
  });

  it("bloqueia divergência entre pedido e caminhos reais", async () => {
    const root = await target();
    const compiled = compileRequest(prepared(0, ["missing"]));
    const report = await inspectReality(compiled.request, root);
    expect(report.verdict).toBe("REQUEST_REALITY_MISMATCH");
  });

  it("bloqueia evidência produzida por outro repositório", async () => {
    const root = await target("git@github.com:outra-org/human-request-compiler.git");
    const compiled = compileRequest(prepared());
    const report = await inspectReality(compiled.request, root);
    expect(report.repositoryIdentity.matches).toBe(false);
    expect(report.verdict).toBe("REQUEST_REALITY_MISMATCH");
  });

  it("executa baseline mutante somente no snapshot descartável", async () => {
    const root = await target();
    const request = prepared();
    request.inspectionPlan!.baselineCommands = [{ id: "mutating", command: process.execPath, args: ["-e", "require('fs').writeFileSync('MUTATED.txt','x')"] }];
    const compiled = compileRequest(request);
    const report = await inspectReality(compiled.request, root);
    expect(report.verdict).toBe("READY_FOR_EXECUTION");
    await expect(access(join(root, "MUTATED.txt"))).rejects.toThrow();
  });

  it("rejeita relatório expirado na própria promoção", async () => {
    const root = await target();
    const compiled = compileRequest(prepared());
    const report = await inspectReality(compiled.request, root, new Date("2026-08-06T12:00:00.000Z"));
    expect(() => promoteRequest(compiled, report, "inspection/report.json", { now: new Date("2026-08-06T12:30:00.001Z") })).toThrow(/expirado/u);
  });

  it("protege horário, evidências e inspectionId pelo fingerprint", async () => {
    const root = await target();
    const compiled = compileRequest(prepared());
    const report = await inspectReality(compiled.request, root);
    expect(verifyEnvironmentFingerprint(report)).toBe(true);
    expect(verifyEnvironmentFingerprint({ ...report, inspectedAt: new Date(Date.parse(report.inspectedAt) + 1000).toISOString() })).toBe(false);
    expect(verifyEnvironmentFingerprint({ ...report, evidence: [...report.evidence, { type: "filesystem", subject: "x", observed: "y" }] })).toBe(false);
    expect(verifyEnvironmentFingerprint({ ...report, inspectionId: "INS-AAAAAAAAAAAAAAAAAAAAAAAA" })).toBe(false);
  });

  it("rejeita relatório pertencente a outro pedido", async () => {
    const root = await target();
    const compiled = compileRequest(prepared());
    const report = await inspectReality(compiled.request, root);
    const other = { ...compiled.request, id: "REQ-OTHER-001" };
    expect(() => promoteRequest(other, report, "inspection/report.json")).toThrow(/Relatório pertence/u);
  });
});
