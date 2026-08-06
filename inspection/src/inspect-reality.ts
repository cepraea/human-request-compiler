import { access, cp, mkdtemp, rm, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import type { HumanRequest } from "../../src/model.js";
import { HumanRequestSchema } from "../../src/model.js";
import {
  calculateEnvironmentFingerprint,
  inspectionIdFromFingerprint,
  RealityInspectionSchema,
  type CommandObservation,
  type InspectionVerdict,
  type RealityInspection
} from "./model.js";

interface RunResult { success: boolean; exitCode: number | null; output: string }

function run(command: string, args: string[], cwd: string): Promise<RunResult> {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.on("error", (error) => resolveRun({ success: false, exitCode: null, output: error.message }));
    child.on("close", (code) => resolveRun({ success: code === 0, exitCode: code, output: output.trim().slice(0, 4000) }));
  });
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function normalizeRepositoryIdentity(value: string): string | undefined {
  const trimmed = value.trim().replace(/\/$/u, "").replace(/\.git$/u, "");
  const ssh = trimmed.match(/^[^@\s]+@[^:]+:([^/\s]+\/[^/\s]+)$/u);
  if (ssh) return ssh[1].toLocaleLowerCase("en-US");
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.replace(/^\//u, "").split("/").filter(Boolean);
    if (parts.length >= 2) return `${parts.at(-2)}/${parts.at(-1)}`.toLocaleLowerCase("en-US");
  } catch {
    if (/^[\w.-]+\/[\w.-]+$/u.test(trimmed)) return trimmed.toLocaleLowerCase("en-US");
  }
  return undefined;
}

function expectedRepositoryIdentity(request: HumanRequest): string | undefined {
  return normalizeRepositoryIdentity(request.object.location) ?? normalizeRepositoryIdentity(request.object.name);
}

function isLocalReference(value: string): boolean {
  const trimmed = value.trim();
  if (/^[a-z]+:\/\//iu.test(trimmed)) return false;
  if (/\s/u.test(trimmed)) return false;
  return /^[.\w/@-]+$/u.test(trimmed);
}

async function exists(path: string): Promise<boolean> {
  try { await stat(path); return true; } catch { return false; }
}

async function canAccess(path: string, mode: number): Promise<boolean> {
  try { await access(path, mode); return true; } catch { return false; }
}

function builtInToolCheck(name: string): { command: string; args: string[] } | undefined {
  const key = normalize(name);
  if (key === "node" || key === "node.js") return { command: "node", args: ["--version"] };
  if (key === "npm") return { command: "npm", args: ["--version"] };
  if (key === "git") return { command: "git", args: ["--version"] };
  if (key === "typescript" || key === "tsc") return { command: "npm", args: ["exec", "--offline", "--", "tsc", "--version"] };
  if (key === "github" || key === "github cli" || key === "gh") return { command: "gh", args: ["--version"] };
  return undefined;
}

async function inspectGit(root: string, expectedRef: string | undefined): Promise<RealityInspection["git"]> {
  const inside = await run("git", ["rev-parse", "--is-inside-work-tree"], root);
  if (!inside.success || inside.output !== "true") return { isRepository: false };
  const [head, branch, status] = await Promise.all([
    run("git", ["rev-parse", "HEAD"], root),
    run("git", ["branch", "--show-current"], root),
    run("git", ["status", "--porcelain=v1", "--untracked-files=all"], root)
  ]);
  const result: RealityInspection["git"] = { isRepository: true, head: head.output, branch: branch.output || "DETACHED", dirty: status.output.length > 0 };
  if (expectedRef) {
    const expected = await run("git", ["rev-parse", expectedRef], root);
    result.expectedRef = expectedRef;
    result.expectedRefMatches = expected.success && expected.output === head.output;
  }
  return result;
}

async function repositoryIdentity(root: string, request: HumanRequest, isRepository: boolean): Promise<RealityInspection["repositoryIdentity"]> {
  const expected = expectedRepositoryIdentity(request);
  if (!isRepository) return expected ? { expected, matches: false } : {};
  const origin = await run("git", ["config", "--get", "remote.origin.url"], root);
  const originUrl = origin.success && origin.output ? origin.output : undefined;
  const actual = originUrl ? normalizeRepositoryIdentity(originUrl) : undefined;
  return { ...(expected ? { expected } : {}), ...(actual ? { actual } : {}), ...(originUrl ? { originUrl } : {}), ...(expected ? { matches: expected === actual } : {}) };
}

async function gitSnapshot(root: string): Promise<string> {
  const [head, status] = await Promise.all([
    run("git", ["rev-parse", "HEAD"], root),
    run("git", ["status", "--porcelain=v1", "--untracked-files=all"], root)
  ]);
  return `${head.success ? head.output : "NO_HEAD"}\n${status.output}`;
}

async function withBaselineSnapshot<T>(root: string, operation: (snapshotRoot: string) => Promise<T>): Promise<T> {
  const temporary = await mkdtemp(join(tmpdir(), "hrc-baseline-"));
  const snapshotRoot = join(temporary, basename(root));
  try {
    await cp(root, snapshotRoot, { recursive: true, force: false, errorOnExist: true });
    return await operation(snapshotRoot);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export async function inspectReality(requestValue: unknown, targetRoot: string, now: Date = new Date()): Promise<RealityInspection> {
  const request: HumanRequest = HumanRequestSchema.parse(requestValue);
  if (request.state !== "READY_FOR_FEASIBILITY_CHECK") throw new Error(`Pedido deve estar em READY_FOR_FEASIBILITY_CHECK, recebido: ${request.state ?? "sem estado"}.`);

  const root = resolve(targetRoot);
  const targetExists = await exists(root);
  const targetReadable = targetExists && await canAccess(root, constants.R_OK);
  const targetWritable = targetExists && await canAccess(root, constants.W_OK);
  const diagnostics: string[] = [];
  const evidence: RealityInspection["evidence"] = [];

  if (!targetExists) diagnostics.push(`Objeto inexistente: ${root}.`);
  if (targetExists && !targetReadable) diagnostics.push(`Objeto sem acesso de leitura: ${root}.`);
  evidence.push({ type: "filesystem", subject: root, observed: `exists=${targetExists}; readable=${targetReadable}; writable=${targetWritable}` });

  const git = targetExists ? await inspectGit(root, request.inspectionPlan?.expectedRef) : { isRepository: false };
  const repositoryExpected = normalize(request.object.type).includes("repositorio");
  const identity = targetExists ? await repositoryIdentity(root, request, git.isRepository) : {};
  if (repositoryExpected && !git.isRepository) diagnostics.push("O pedido declara um repositório, mas o alvo não é um repositório Git.");
  if (identity.matches === false) diagnostics.push(`Identidade do repositório divergente: esperado ${identity.expected}, observado ${identity.actual ?? "sem origin"}.`);
  if (git.expectedRefMatches === false) diagnostics.push(`O HEAD atual não corresponde à referência esperada ${git.expectedRef}.`);
  evidence.push({ type: "git", subject: root, observed: JSON.stringify({ git, identity }), command: "git rev-parse/status/config" });

  const explicitChecks = new Map((request.inspectionPlan?.toolChecks ?? []).map((item) => [normalize(item.name), item]));
  const tools: RealityInspection["tools"] = [];
  for (const name of request.executability.requiredTools) {
    const explicit = explicitChecks.get(normalize(name));
    const check = explicit ? { command: explicit.command, args: explicit.args ?? [] } : builtInToolCheck(name);
    if (!check || !targetExists) {
      tools.push({ name, command: check?.command ?? "UNDECLARED", available: false, exitCode: null, output: check ? "Target unavailable" : "No machine-checkable command declared" });
      diagnostics.push(`Ferramenta sem verificação objetiva ou indisponível: ${name}.`);
      continue;
    }
    const result = await run(check.command, check.args, root);
    tools.push({ name, command: [check.command, ...check.args].join(" "), available: result.success, exitCode: result.exitCode, output: result.output });
    if (!result.success) diagnostics.push(`Ferramenta indisponível: ${name}.`);
    evidence.push({ type: "tool", subject: name, observed: result.output || `exit=${result.exitCode}`, command: [check.command, ...check.args].join(" "), ...(result.exitCode === null ? {} : { exitCode: result.exitCode }) });
  }

  const sourceReferences = [...new Set([request.sources.canonical, ...request.sources.allowed])];
  const sources: RealityInspection["sources"] = [];
  for (const reference of sourceReferences) {
    const local = isLocalReference(reference);
    const available = local && targetExists ? await exists(isAbsolute(reference) ? reference : resolve(root, reference)) : null;
    sources.push({ reference, local, available });
    if (local && available === false) diagnostics.push(`Fonte local indisponível: ${reference}.`);
    evidence.push({ type: "source", subject: reference, observed: local ? `available=${available}` : "external-or-semantic-reference" });
  }

  const plannedPaths = new Set(request.inspectionPlan?.requiredPaths ?? []);
  for (const rule of request.scope.include) if (isLocalReference(rule)) plannedPaths.add(rule);
  const scope: RealityInspection["scope"] = [];
  for (const rule of plannedPaths) {
    const present = targetExists ? await exists(isAbsolute(rule) ? rule : resolve(root, rule)) : false;
    scope.push({ rule, kind: "include", local: true, exists: present });
    if (!present) diagnostics.push(`Caminho obrigatório ausente: ${rule}.`);
    evidence.push({ type: "scope", subject: rule, observed: `include; exists=${present}` });
  }
  for (const rule of request.scope.exclude) {
    const local = isLocalReference(rule);
    const present = local && targetExists ? await exists(isAbsolute(rule) ? rule : resolve(root, rule)) : null;
    scope.push({ rule, kind: "exclude", local, exists: present });
  }

  const baseline: CommandObservation[] = [];
  const baselineCommands = request.inspectionPlan?.baselineCommands ?? [];
  if (repositoryExpected && baselineCommands.length === 0) diagnostics.push("Nenhum comando de baseline foi declarado para o repositório.");
  if (targetExists && baselineCommands.length > 0) {
    const before = git.isRepository ? await gitSnapshot(root) : undefined;
    await withBaselineSnapshot(root, async (snapshotRoot) => {
      for (const item of baselineCommands) {
        const required = item.required ?? true;
        const args = item.args ?? [];
        const result = await run(item.command, args, snapshotRoot);
        baseline.push({ id: item.id, command: item.command, args, required, success: result.success, exitCode: result.exitCode, output: result.output });
        if (required && !result.success) diagnostics.push(`Baseline obrigatório falhou: ${item.id}.`);
        evidence.push({ type: "baseline", subject: item.id, observed: result.output || `exit=${result.exitCode}`, command: [item.command, ...args].join(" "), ...(result.exitCode === null ? {} : { exitCode: result.exitCode }) });
      }
    });
    const after = git.isRepository ? await gitSnapshot(root) : undefined;
    if (before !== after) diagnostics.push("A inspeção alterou o checkout original durante o baseline.");
  } else {
    for (const item of baselineCommands) baseline.push({ id: item.id, command: item.command, args: item.args ?? [], required: item.required ?? true, success: false, exitCode: null, output: "Target unavailable" });
  }

  let verdict: InspectionVerdict = "READY_FOR_EXECUTION";
  if (!targetExists || !targetReadable) verdict = "BLOCKED_BY_ACCESS";
  else if (tools.some((tool) => !tool.available)) verdict = "BLOCKED_BY_TOOLING";
  else if (sources.some((source) => source.local && source.available === false)) verdict = "SOURCE_UNAVAILABLE";
  else if ((repositoryExpected && !git.isRepository) || identity.matches === false || git.expectedRefMatches === false || scope.some((item) => item.kind === "include" && item.exists === false)) verdict = "REQUEST_REALITY_MISMATCH";
  else if ((repositoryExpected && baselineCommands.length === 0) || baseline.some((item) => item.required && !item.success) || diagnostics.includes("A inspeção alterou o checkout original durante o baseline.")) verdict = "BASELINE_UNSTABLE";

  const provisional = {
    schemaVersion: "1.0.0" as const,
    requestId: request.id,
    inspectedAt: now.toISOString(),
    target: { root, exists: targetExists, readable: targetReadable, writable: targetWritable },
    repositoryIdentity: identity,
    git,
    tools,
    baseline,
    sources,
    scope,
    evidence,
    diagnostics,
    verdict
  };
  const environmentFingerprint = calculateEnvironmentFingerprint(provisional);
  const inspectionId = inspectionIdFromFingerprint(environmentFingerprint);
  return RealityInspectionSchema.parse({ ...provisional, inspectionId, environmentFingerprint });
}
