import type { Finding } from "./types";

const COST = { critical: 20, warn: 8, info: 1, inconclusive: 0, pass: 0 } as const;

export const score = (findings: Finding[]) => {
  if (findings.length === 0) return 0;
  const totalDeductions = findings.reduce((sum, f) => {
    // If finding has an explicit calibrated scoreImpact, use its absolute value
    if (typeof f.scoreImpact === "number") {
      return sum + Math.abs(f.scoreImpact);
    }
    return sum + (COST[f.severity] ?? 0);
  }, 0);
  return Math.max(0, 100 - totalDeductions);
};
