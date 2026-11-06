import type { Finding } from "./types";

const COST = { critical: 20, warn: 8, info: 2, pass: 0 } as const;

export const score = (findings: Finding[]) =>
  findings.length === 0
    ? 0
    : Math.max(0, 100 - findings.reduce((sum, f) => sum + COST[f.severity], 0));