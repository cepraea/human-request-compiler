import { writeFile } from "node:fs/promises";
import { requestFromGithubEvent } from "./github-issue.js";
import { compileRequest } from "./compile-request.js";

const eventPath = process.argv[2] ?? process.env.GITHUB_EVENT_PATH;
if (!eventPath) throw new Error("Informe o caminho do evento do GitHub.");

const result = compileRequest(await requestFromGithubEvent(eventPath));
await writeFile("issue-validation-report.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify({ state: result.state, diagnostics: result.diagnostics }, null, 2));
if (result.state !== "READY_FOR_EXECUTION") process.exitCode = 1;
