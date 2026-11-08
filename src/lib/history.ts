import type { Finding } from "./types";

export type Counts = { critical: number; warn: number; info: number; pass: number; inconclusive?: number };
export type Entry = { id: string; domain: string; score: number; at: number; counts: Counts; findings: Finding[] };

const KEY = "paharadar:history:v2";

export const cleanDomain = (s: string) =>
  s.trim().replace(/^https?:\/\//i, "").replace(/[/?#].*$/, "").toLowerCase();

export const countsOf = (f: Finding[]): Counts => ({
  critical: f.filter((x) => x.severity === "critical").length,
  warn: f.filter((x) => x.severity === "warn").length,
  info: f.filter((x) => x.severity === "info").length,
  pass: f.filter((x) => x.severity === "pass").length,
  inconclusive: f.filter((x) => x.severity === "inconclusive").length,
});

export function loadHistory(): Entry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function write(list: Entry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 40))); } catch { /* storage unavailable */ }
}

export const saveEntry = (e: Omit<Entry, "id">) =>
  write([{ ...e, id: `${e.at}-${e.domain}` }, ...loadHistory()]);

export const deleteEntry = (id: string) => write(loadHistory().filter((e) => e.id !== id));

export function clearHistory() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export const lastScore = (domain: string) => loadHistory().find((e) => e.domain === domain)?.score ?? null;