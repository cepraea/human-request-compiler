import type { PerformanceMetrics } from "./types.js";
export function evaluateEfficiency(metrics: PerformanceMetrics): number {
  const score = 100 - Math.max(0, metrics.attempts - 1) * 2 - metrics.unjustifiedHumanInterventions * 10 - metrics.scopeViolations * 20 - metrics.regressions * 25 - metrics.falseSuccessDeclarations * 30;
  return Math.max(0, Math.min(100, score));
}
export function classifyEfficiency(score: number): "EXCELLENT" | "ACCEPTABLE" | "INEFFICIENT" | "SEVERELY_INEFFICIENT" {
  if (score >= 90) return "EXCELLENT";
  if (score >= 75) return "ACCEPTABLE";
  if (score >= 50) return "INEFFICIENT";
  return "SEVERELY_INEFFICIENT";
}
