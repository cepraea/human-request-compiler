import { readFile } from "node:fs/promises";
import YAML from "yaml";

function parseLabeledText(text: string): Record<string, unknown> {
  const sections = new Map<string, string>();
  let current = "";
  for (const rawLine of text.split(/\r?\n/)) {
    const heading = rawLine.match(/^([A-ZÁÉÍÓÚÃÕÇ _-]{3,}):\s*(.*)$/u);
    if (heading) {
      current = heading[1]!.trim().toLowerCase();
      sections.set(current, heading[2]!.trim());
    } else if (current && rawLine.trim()) {
      sections.set(current, `${sections.get(current) ?? ""} ${rawLine.trim()}`.trim());
    }
  }
  return {
    schemaVersion: "1.0.0",
    id: "REQ-DRAFT",
    title: sections.get("título") ?? sections.get("title") ?? "Pedido em elaboração",
    objective: {
      outcome: sections.get("objetivo") ?? "",
      purpose: sections.get("finalidade") ?? "",
      priority: sections.get("prioridade") ?? ""
    },
    object: {
      type: sections.get("tipo do objeto") ?? "",
      name: sections.get("objeto") ?? "",
      location: sections.get("localização") ?? ""
    },
    currentState: { problem: sections.get("estado atual") ?? "", evidence: [] },
    transformation: { action: sections.get("ação") ?? "", from: sections.get("de") ?? "", to: sections.get("para") ?? "" },
    expectedState: { artifact: sections.get("entregável") ?? "", behaviors: [], mustNotHappen: [] },
    sources: { canonical: "", allowed: [], forbidden: [], conflictRule: "" },
    scope: { include: [], exclude: [] },
    constraints: [], acceptanceCriteria: [],
    authority: { executor: "IA", approver: "", authorizedActions: [], reservedActions: [], destructiveActionsRequireApproval: true },
    delivery: { format: "", location: "", evidenceRequired: [] },
    completion: { doneWhen: [], failureWhen: [] },
    executability: { environment: "", requiredTools: [], accessConfirmed: false },
    pendingHumanDecisions: []
  };
}

export function parseRequestText(text: string, extension = ""): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("O pedido está vazio.");
  if (extension.endsWith(".yaml") || extension.endsWith(".yml")) return YAML.parse(trimmed);
  if (extension.endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) return JSON.parse(trimmed);
  try { return YAML.parse(trimmed); } catch { return parseLabeledText(trimmed); }
}

export async function parseRequestFile(path: string): Promise<unknown> {
  return parseRequestText(await readFile(path, "utf8"), path.toLowerCase());
}
