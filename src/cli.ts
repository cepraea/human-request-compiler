import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseRequestFile } from "./parse-request.js";
import { compileRequest } from "./compile-request.js";
import { extractHumanRequest } from "./extract-human-request.js";
import { evaluateExecution } from "../evaluation/src/evaluate-execution.js";
import { inspectReality } from "../inspection/src/inspect-reality.js";
import { promoteRequest } from "../inspection/src/promote-request.js";

function takeOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  args.splice(index, value === undefined ? 1 : 2);
  return value;
}
async function save(path: string, content: string): Promise<void> { await mkdir(dirname(path), { recursive: true }); await writeFile(path, content); }

const args = process.argv.slice(2);
const command = args.shift();
const outputPath = takeOption(args, "--out") ?? takeOption(args, "--report");
const reportPathOption = takeOption(args, "--report-path");
const contextOutputPath = takeOption(args, "--context-out");
if (!command) throw new Error("Use: compile, validate, inspect, promote ou evaluate.");

if (command === "compile" || command === "validate") {
  const input = args[0];
  if (!input) throw new Error("Informe o arquivo do pedido.");
  const result = compileRequest(await parseRequestFile(input));
  const output = JSON.stringify(result, null, 2);
  if (outputPath) await save(outputPath, output); else console.log(output);
  if (result.state !== "READY_FOR_FEASIBILITY_CHECK") process.exitCode = 1;
} else if (command === "inspect") {
  const [input, targetRoot] = args;
  if (!input || !targetRoot) throw new Error("Use: inspect <pedido-compilado.json> <diretório-alvo>.");
  const request = extractHumanRequest(JSON.parse(await readFile(input, "utf8")) as unknown);
  const report = await inspectReality(request, targetRoot);
  const output = JSON.stringify(report, null, 2);
  if (outputPath) await save(outputPath, output); else console.log(output);
  if (report.verdict !== "READY_FOR_EXECUTION") process.exitCode = 1;
} else if (command === "promote") {
  const [input, inspectionPath] = args;
  if (!input || !inspectionPath) throw new Error("Use: promote <pedido-compilado.json> <reality-inspection.json>.");
  const request = JSON.parse(await readFile(input, "utf8")) as unknown;
  const report = JSON.parse(await readFile(inspectionPath, "utf8")) as unknown;
  const promoted = promoteRequest(request, report, reportPathOption ?? inspectionPath);
  const output = JSON.stringify(promoted.request, null, 2);
  if (outputPath) await save(outputPath, output); else console.log(output);
  if (contextOutputPath) await save(contextOutputPath, JSON.stringify(promoted.context, null, 2));
} else if (command === "evaluate") {
  const [input, reportFile] = args;
  if (!input || !reportFile) throw new Error("Use: evaluate <pedido.json> <execution-report.json>.");
  const request = JSON.parse(await readFile(input, "utf8")) as unknown;
  const report = JSON.parse(await readFile(reportFile, "utf8")) as unknown;
  const result = evaluateExecution(request, report);
  const output = JSON.stringify(result, null, 2);
  if (outputPath) await save(outputPath, output); else console.log(output);
  if (result.status !== "EXECUTED_AND_VALIDATED" && result.status !== "NEEDS_HUMAN_ACCEPTANCE") process.exitCode = 1;
} else {
  throw new Error(`Comando desconhecido: ${command}`);
}
