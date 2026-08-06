import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export function projectPath(...parts: string[]): string {
  const cwdCandidate = resolve(process.cwd(), ...parts);
  if (existsSync(cwdCandidate)) return cwdCandidate;
  return resolve(here, "..", ...parts);
}

export function relativeProjectPath(...parts: string[]): string {
  return join(...parts);
}
