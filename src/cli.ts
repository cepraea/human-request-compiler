import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseRequestFile } from "./parse-request.js";
import { compileRequest } from "./compile-request.js";
import { evaluateExecution } from "../evaluation/src/evaluate-execution.js";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
async function save(path: string, content: string): Promise<void> { await mkdir(dirname(path), { recursive: true }); await writeFile(path, content); }

const [command, input, second] = process.argv.slice(2).filter((arg) => !arg.startsWith("--") && ![option("--out"), option("--report")].includes(arg));
if (!command) throw new Error("Use: compile <arquivo>, validate <arquivo> ou evaluate <pedido> <relatório>.");

if (command === "compile" || command === "validate") {
  if (!input) throw new Error("Informe o arquivo do pedido.");
  const result = compileRequest(await parseRequestFile(input));
  const output = JSON.stringify(result, null, 2);
  const outputPath = option("--out") ?? option("--report");
  if (outputPath) await save(outputPath, output); else console.log(output);
  if (result.state !== "READY_FOR_EXECUTION") process.exitCode = 1;
} else if (command === "evaluate") {
  if (!input || !second) throw new Error("Use: evaluate <pedido.json> <execution-report.json>.");
  const request = JSON.parse(await readFile(input, "utf8")) as unknown;
  const report = JSON.parse(await readFile(second, "utf8")) as unknown;
  const result = evaluateExecution(request, report);
  const output = JSON.stringify(result, null, 2);
  const outputPath = option("--out") ?? option("--report");
  if (outputPath) await save(outputPath, output); else console.log(output);
  if (result.status !== "EXECUTED_AND_VALIDATED" && result.status !== "NEEDS_HUMAN_ACCEPTANCE") process.exitCode = 1;
} else {
  throw new Error(`Comando desconhecido: ${command}`);
}
