"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import type { Finding } from "@/lib/types";
import { CATS, CAT_ORDER } from "@/lib/categories";
import { SEV } from "@/lib/severity";
import { buildKits } from "@/lib/fixkit";
import { download, findingsCsv } from "@/lib/export";
import { Check, Copy, Download, Printer, CheckCircle2, ArrowRight, FileCode } from "lucide-react";

const ORDER = { critical: 0, warn: 1, info: 2, pass: 3 } as const;

export function CategoryBars({ findings }: { findings: Finding[] }) {
  const rows = CAT_ORDER.map((c) => {
    const list = findings.filter((f) => f.category === c);
    return { c, total: list.length, pass: list.filter((f) => f.severity === "pass").length };
  }).filter((r) => r.total > 0);

  if (!rows.length) return null;

  return (
    <div className="glass-panel mb-5 grid gap-4 rounded-3xl p-5 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => {
        const pct = Math.round((r.pass / r.total) * 100);
        return (
          <div key={r.c} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-white">{CATS[r.c].label}</span>
              <span className={pct === 100 ? "text-emerald-400" : "text-amber-400"}>{pct}% OK</span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div
                className={`h-full rounded-full ${CATS[r.c].bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-mute">
              <span>{r.pass} of {r.total} passed</span>
              <span>{r.total - r.pass} issues</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ActionPlan({
  domain,
  findings,
  onOpen,
}: {
  domain: string;
  findings: Finding[];
  onOpen: (f: Finding) => void;
}) {
  const key = `paharadar:plan:${domain}`;
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(key) ?? "[]"));
    } catch {
      setDone([]);
    }
  }, [key]);

  const todo = useMemo(
    () => findings.filter((f) => f.severity !== "pass").sort((a, b) => ORDER[a.severity] - ORDER[b.severity]),
    [findings]
  );
  const finished = todo.filter((f) => done.includes(f.id)).length;
  const pct = todo.length ? (finished / todo.length) * 100 : 100;

  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    setDone(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  if (!todo.length) {
    return (
      <div className="glass-panel rounded-3xl p-10 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
        <h3 className="text-lg font-bold text-white">All Security Baseline Checks Passed</h3>
        <p className="text-xs text-mute mt-1">No outstanding configuration errors were found.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-7">
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <div>
          <h3 className="text-lg font-bold text-white">Interactive Hardening Checklist</h3>
          <p className="text-xs text-mute mt-0.5">Check off issues as you deploy patches to your server</p>
        </div>
        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
          {finished} of {todo.length} Done
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Action items */}
      <ul className="mt-5 divide-y divide-white/[0.06]">
        {todo.map((f) => {
          const on = done.includes(f.id);
          return (
            <li key={f.id} className="flex items-start gap-4 py-4 px-2 rounded-2xl hover:bg-white/[0.02] transition-colors">
              <button
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(f.id)}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all ${
                  on
                    ? "border-emerald-400 bg-emerald-400 text-black font-bold"
                    : "border-white/20 bg-white/[0.04] hover:border-emerald-400"
                }`}
              >
                {on && "✓"}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${on ? "text-mute line-through" : "text-white"}`}>
                    {f.title}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase font-bold ${SEV[f.severity].badge}`}>
                    {SEV[f.severity].label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-mute leading-relaxed">{f.found}</p>
                <div className="mt-2.5 flex items-center gap-4 text-xs font-medium">
                  <span className="text-mute">Effort: ~{CATS[f.category].effort}</span>
                  <button
                    onClick={() => onOpen(f)}
                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                  >
                    <span>View fix snippet</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function FixKit({ findings }: { findings: Finding[] }) {
  const kits = useMemo(() => buildKits(findings), [findings]);
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!kits.length) {
    return (
      <div className="glass-panel rounded-3xl p-10 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
        <h3 className="text-lg font-bold text-white">No Missing Headers Detected</h3>
        <p className="text-xs text-mute mt-1">All standard protective response headers are configured.</p>
      </div>
    );
  }

  const k = kits[Math.min(i, kits.length - 1)];
  const copy = () => {
    navigator.clipboard.writeText(k.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-7">
      <div className="pb-4 border-b border-white/[0.08]">
        <h3 className="text-lg font-bold text-white">Automated Drop-in Configuration Kit</h3>
        <p className="mt-1 text-xs text-mute">
          One block solving every missing header detected on your target website.
        </p>
      </div>

      {/* Server tabs */}
      <div className="mt-5 flex flex-wrap gap-2">
        {kits.map((x, n) => (
          <button
            key={x.label}
            onClick={() => setI(n)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              n === i
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "border border-white/10 text-mute hover:text-white hover:bg-white/5"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {/* Code Display */}
      <div className="relative mt-4 rounded-2xl border border-white/[0.08] bg-black/80 p-4">
        <pre className="overflow-x-auto font-mono text-xs text-emerald-300 leading-relaxed">
          <code>{k.code}</code>
        </pre>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
        <button
          onClick={copy}
          className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? "Copied" : "Copy Configuration"}</span>
        </button>

        <button
          onClick={() => download(k.file, k.code, "text/plain")}
          className="btn-secondary inline-flex items-center gap-1.5 rounded-xl px-4 py-2"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download {k.file}</span>
        </button>
      </div>
    </div>
  );
}

export function ExportPanel({
  domain,
  findings,
  onPrint,
}: {
  domain: string;
  findings: Finding[];
  onPrint: () => void;
}) {
  const base = `paharadar-${domain}-${new Date().toISOString().slice(0, 10)}`;

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-7">
      <div className="pb-4 border-b border-white/[0.08]">
        <h3 className="text-lg font-bold text-white">Export &amp; Share Audit Report</h3>
        <p className="mt-1 text-xs text-mute">
          Take your findings with you. All data is generated in-browser; zero data is transmitted.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() =>
            download(
              `${base}.json`,
              JSON.stringify(
                { tool: "Paharadar", domain, timestamp: new Date().toISOString(), findings },
                null,
                2
              ),
              "application/json"
            )
          }
          className="btn-secondary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold"
        >
          <FileCode className="h-4 w-4" />
          <span>Export JSON</span>
        </button>

        <button
          onClick={() => download(`${base}.csv`, findingsCsv(domain, findings), "text/csv")}
          className="btn-secondary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </button>

        <button
          onClick={onPrint}
          className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold"
        >
          <Printer className="h-4 w-4" />
          <span>Print / Save as PDF</span>
        </button>
      </div>
    </div>
  );
}
