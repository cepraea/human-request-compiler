import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { compileRequest } from "../src/compile-request.js";
import { HumanRequestSchema, type HumanRequest } from "../src/model.js";
import { inspectReality } from "../inspection/src/inspect-reality.js";
import { promoteRequest } from "../inspection/src/promote-request.js";

const roots: string[] = [];
const fixture = (): HumanRequest => HumanRequestSchema.parse(JSON.parse(readFileSync("tests/valid/complete-request.json", "utf8")) as unknown);

async function target(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "hrc-inspection-"));
  roots.push(root);
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "src", "index.ts"), "export const ready = true;\n");
  for (const args of [["init"], ["config", "user.email", "test@example.com"], ["config", "user.name", "HRC Test"], ["add", "."], ["commit", "-m", "baseline"]]) {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  }
  return root;
}

function prepared(root: string, baselineExit = 0, requiredPaths = ["src"]): HumanRequest {
  const request = fixture();
  request.object.location = root;
  request.scope.include = ["src"];
  request.scope.exclude = ["outside"];
  request.sources.canonical = "src";
  request.sources.allowed = ["src"];
  request.executability.requiredTools = ["node"];
  request.inspectionPlan = {
    expectedRef: "HEAD",
    requiredPaths,
    toolChecks: [{ name: "node", command: process.execPath, args: ["--version"] }],
    baselineCommands: [{ id: "baseline", command: process.execPath, args: ["-e", `process.exit(${baselineExit})`] }]
  };
  return request;
}

afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("reality inspection gate", () => {
  it("separa prontidão semântica e promove somente após inspeção válida", async () => {
    const root = await target();
    const compiled = compileRequest(prepared(root));
    expect(compiled.state).toBe("READY_FOR_FEASIBILITY_CHECK");
    const report = await inspectReality(compiled.request, root);
    expect(report.verdict).toBe("READY_FOR_EXECUTION");
    const promoted = promoteRequest(compiled.request, report, "inspection/reality-inspection.json");
    expect(promoted.request.state).toBe("READY_FOR_EXECUTION");
    expect(promoted.request.feasibility?.environmentFingerprint).toBe(report.environmentFingerprint);
    expect(promoted.context.state).toBe("READY_FOR_EXECUTION");
  });

  it("bloqueia baseline instável", async () => {
    const root = await target();
    const compiled = compileRequest(prepared(root, 2));
    const report = await inspectReality(compiled.request, root);
    expect(report.verdict).toBe("BASELINE_UNSTABLE");
    expect(() => promoteRequest(compiled.request, report, "inspection/report.json")).toThrow(/não liberou execução/u);
  });

  it("bloqueia divergência entre pedido e caminhos reais", async () => {
    const root = await target();
    const compiled = compileRequest(prepared(root, 0, ["missing"]));
    const report = await inspectReality(compiled.request, root);
    expect(report.verdict).toBe("REQUEST_REALITY_MISMATCH");
  });

  it("rejeita relatório pertencente a outro pedido", async () => {
    const root = await target();
    const compiled = compileRequest(prepared(root));
    const report = await inspectReality(compiled.request, root);
    const other = { ...compiled.request, id: "REQ-OTHER-001" };
    expect(() => promoteRequest(other, report, "inspection/report.json")).toThrow(/Relatório pertence/u);
  });
});
