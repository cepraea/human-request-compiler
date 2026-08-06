import { useMemo, useState } from "react";
import { JsonForms } from "@jsonforms/react";
import { materialCells, materialRenderers } from "@jsonforms/material-renderers";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import schema from "../../schemas/human-request.schema.json";
import acceptanceSchema from "../../schemas/acceptance-criterion.schema.json";
import authoritySchema from "../../schemas/authority.schema.json";

const initial = {
  schemaVersion: "1.0.0", id: "REQ-DRAFT", title: "", objective: { outcome: "", purpose: "", priority: "" },
  object: { type: "", name: "", location: "" }, currentState: { problem: "", evidence: [] },
  transformation: { action: "", from: "", to: "" }, expectedState: { artifact: "", behaviors: [], mustNotHappen: [] },
  sources: { canonical: "", allowed: [], forbidden: [], conflictRule: "" }, scope: { include: [], exclude: [] }, constraints: [],
  acceptanceCriteria: [], authority: { executor: "IA", approver: "", authorizedActions: [], reservedActions: [], destructiveActionsRequireApproval: true },
  delivery: { format: "", location: "", evidenceRequired: [] }, completion: { doneWhen: [], failureWhen: [] },
  executability: { environment: "", requiredTools: [], accessConfirmed: false }, pendingHumanDecisions: []
};

const uischema = { type: "VerticalLayout", elements: [
  { type: "Group", label: "Identidade e objetivo", elements: [{ type: "Control", scope: "#/properties/id" }, { type: "Control", scope: "#/properties/title" }, { type: "Control", scope: "#/properties/objective" }] },
  { type: "Group", label: "Objeto e transformação", elements: [{ type: "Control", scope: "#/properties/object" }, { type: "Control", scope: "#/properties/currentState" }, { type: "Control", scope: "#/properties/transformation" }, { type: "Control", scope: "#/properties/expectedState" }] },
  { type: "Group", label: "Fontes, escopo e restrições", elements: [{ type: "Control", scope: "#/properties/sources" }, { type: "Control", scope: "#/properties/scope" }, { type: "Control", scope: "#/properties/constraints" }] },
  { type: "Group", label: "Aceitação e autoridade", elements: [{ type: "Control", scope: "#/properties/acceptanceCriteria" }, { type: "Control", scope: "#/properties/authority" }] },
  { type: "Group", label: "Entrega e execução", elements: [{ type: "Control", scope: "#/properties/delivery" }, { type: "Control", scope: "#/properties/completion" }, { type: "Control", scope: "#/properties/executability" }, { type: "Control", scope: "#/properties/pendingHumanDecisions" }] }
] };

export default function App() {
  const [data, setData] = useState<unknown>(initial);
  const [errors, setErrors] = useState(0);
  const ajv = useMemo(() => { const instance = new Ajv2020({ allErrors: true, strict: false }); addFormats(instance); instance.addSchema(acceptanceSchema); instance.addSchema(authoritySchema); return instance; }, []);
  const state = errors === 0 && (data as typeof initial).executability?.accessConfirmed && (data as typeof initial).pendingHumanDecisions?.length === 0 ? "ESTRUTURALMENTE_VÁLIDO" : "NÃO_LIBERADO";
  const download = () => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${(data as typeof initial).id || "request"}.json`; a.click(); URL.revokeObjectURL(url); };
  return <main><header><h1>Human Request Compiler</h1><p>Capture estruturada sem API comercial. A liberação definitiva ocorre pela CLI, que também aplica regras semânticas.</p><strong className={state === "ESTRUTURALMENTE_VÁLIDO" ? "ok" : "blocked"}>{state}</strong></header><section><JsonForms schema={schema} uischema={uischema} data={data} renderers={materialRenderers} cells={materialCells} ajv={ajv} onChange={({ data: next, errors: nextErrors }) => { setData(next); setErrors(nextErrors?.length ?? 0); }} /></section><footer><button onClick={download}>Baixar JSON</button><pre>{JSON.stringify(data, null, 2)}</pre></footer></main>;
}
