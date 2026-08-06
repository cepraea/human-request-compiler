import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { validateReadyRequest } from "../inspection/src/validate-ready-request.js";

const directory = process.argv[2] ?? "requests/ready";
let entries: string[] = [];
try { entries = (await readdir(directory)).filter((name) => name.endsWith(".json")); } catch { entries = []; }
let failed = false;
for (const entry of entries) {
  const path = join(directory, entry);
  const value = JSON.parse(await readFile(path, "utf8")) as unknown;
  const result = await validateReadyRequest(value, process.cwd());
  console.log(`${path}: ${result.valid ? "READY_FOR_EXECUTION" : "INVALID"}`);
  if (!result.valid) {
    failed = true;
    for (const diagnostic of result.diagnostics) console.error(`  ${diagnostic.severity.toUpperCase()} ${diagnostic.code} ${diagnostic.path}: ${diagnostic.message}`);
  }
}
if (failed) process.exitCode = 1;
