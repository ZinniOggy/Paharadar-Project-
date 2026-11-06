"use client";
import { useCallback, useState } from "react";
import type { Finding } from "@/lib/types";
import { cleanDomain, countsOf, lastScore, saveEntry } from "@/lib/history";
import { score } from "@/lib/score";

export function useScan() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [status, setStatus] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [previous, setPrevious] = useState<number | null>(null);
  const [domain, setDomain] = useState("");

  const reset = useCallback(() => {
    setFindings([]); setStatus("idle"); setError(""); setPrevious(null); setDomain("");
  }, []);

  const run = useCallback(async (input: string, consent: boolean) => {
    const d = cleanDomain(input);
    setDomain(d); setFindings([]); setError(""); setStatus("scanning"); setPrevious(lastScore(d));

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: d, consent }),
      });
      if (!res.ok || !res.body) {
        setError((await res.json().catch(() => ({}))).error ?? "Scan failed.");
        setStatus("error");
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      const all: Finding[] = [];
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop()!;
        for (const l of lines) {
          if (!l) continue;
          const m = JSON.parse(l);
          if (m.type === "finding") { all.push(m.finding); setFindings([...all]); }
        }
      }
      if (all.length) saveEntry({ domain: d, score: score(all), at: Date.now(), counts: countsOf(all), findings: all });
      setStatus("done");
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }, []);

  return { findings, status, error, previous, domain, run, reset };
}