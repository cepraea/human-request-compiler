import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { compileRequest } from "./compile-request.js";

const directory = process.argv[2] ?? "requests/ready";
let entries: string[] = [];
try { entries = (await readdir(directory)).filter((name) => name.endsWith(".json")); } catch { entries = []; }
let failed = false;
for (const entry of entries) {
  const path = join(directory, entry);
  const value = JSON.parse(await readFile(path, "utf8")) as unknown;
  const result = compileRequest(value);
  console.log(`${path}: ${result.state}`);
  if (result.state !== "READY_FOR_EXECUTION") {
    failed = true;
    for (const diagnostic of result.diagnostics) console.error(`  ${diagnostic.severity.toUpperCase()} ${diagnostic.code} ${diagnostic.path}: ${diagnostic.message}`);
  }
}
if (failed) process.exitCode = 1;
