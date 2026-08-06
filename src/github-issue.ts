import { readFile } from "node:fs/promises";
import { parseRequestText } from "./parse-request.js";

export function extractCanonicalJson(issueBody: string): unknown {
  const section = issueBody.match(/### Pedido canônico \(JSON\)\s+([\s\S]*?)(?=\n### |$)/u)?.[1]?.trim() ?? issueBody;
  const fenced = section.match(/```(?:json)?\s*([\s\S]*?)```/iu)?.[1]?.trim() ?? section;
  return parseRequestText(fenced, ".json");
}

export async function requestFromGithubEvent(eventPath: string): Promise<unknown> {
  const event = JSON.parse(await readFile(eventPath, "utf8")) as { issue?: { body?: string } };
  if (!event.issue?.body) throw new Error("O evento não contém corpo de Issue.");
  return extractCanonicalJson(event.issue.body);
}
