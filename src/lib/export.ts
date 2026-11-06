import type { Entry } from "./history";
import type { Finding } from "./types";

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// quote every cell, and defuse spreadsheet formulas (header values come from the scanned site)
const q = (v: string | number) => {
  const s = String(v);
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};
const toCsv = (rows: (string | number)[][]) => rows.map((r) => r.map(q).join(",")).join("\n");

export const findingsCsv = (domain: string, findings: Finding[]) =>
  toCsv([
    ["domain", "severity", "category", "check", "observed", "why"],
    ...findings.map((f) => [domain, f.severity, f.category, f.title, f.found, f.why]),
  ]);

export const historyCsv = (list: Entry[]) =>
  toCsv([
    ["domain", "scanned_at", "score", "critical", "warnings", "notices", "passes"],
    ...list.map((e) => [e.domain, new Date(e.at).toISOString(), e.score, e.counts.critical, e.counts.warn, e.counts.info, e.counts.pass]),
  ]);