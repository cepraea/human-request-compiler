import type { ExecutionReport } from "./types.js";
export function evaluateRegressions(report: ExecutionReport): string[] { return report.metrics.regressions > 0 ? [`Foram registradas ${report.metrics.regressions} regressão(ões).`] : []; }
