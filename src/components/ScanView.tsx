"use client";
import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useScanCtx } from "./ScanProvider";
import { ScanForm } from "./ScanForm";
import { PageHeader } from "./PageHeader";
import { ScoreRing } from "./ScoreRing";
import { FindingRow } from "./FindingRow";
import { DetailsPanel } from "./DetailsPanel";
import { ScanPortal } from "./ScanPortal";
import { CategoryBars, ActionPlan, FixKit, ExportPanel } from "./ResultTabs";
import { score } from "@/lib/score";
import { loadHistory, type Entry } from "@/lib/history";
import type { Finding } from "@/lib/types";
import { Shield, Activity, RefreshCw, AlertTriangle, Filter, CheckCircle2, FileText, ArrowRight } from "lucide-react";

const TABS = [
  ["findings", "Findings"],
  ["kit", "Fix Kit"],
  ["plan", "Action Plan"],
  ["export", "Export Report"],
] as const;

type Tab = (typeof TABS)[number][0];
type FilterSev = "all" | "critical" | "warn" | "pass";
const ORDER = { critical: 0, warn: 1, info: 2, pass: 3 } as const;

export function ScanView() {
  const { status, findings, error, previous, domain, open, setOpen, reset, setInput } = useScanCtx();
  const [tab, setTab] = useState<Tab>("findings");
  const [filter, setFilter] = useState<FilterSev>("all");
  const [recent, setRecent] = useState<Entry[]>([]);

  useEffect(() => {
    if (status !== "idle") return;
    const seen = new Set<string>();
    setRecent(loadHistory().filter((e) => !seen.has(e.domain) && seen.add(e.domain)).slice(0, 6));
  }, [status]);

  if (status === "idle") {
    return (
      <div className="pb-24 pt-6">
        <PageHeader
          eyebrow="Target Scanner"
          title={<>Analyze any website <span className="text-gradient">in real time.</span></>}
        >
          Enter a domain you own or have permission to test. Paharadar safely reads public HTTP headers, cryptographic certificates, and DNS records.
        </PageHeader>

        <div className="mt-6 max-w-2xl">
          <ScanForm />
        </div>

        {recent.length > 0 && (
          <div className="mt-10 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-mute">Recent Audits</span>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {recent.map((h) => (
                <button
                  key={h.domain}
                  onClick={() => setInput(h.domain)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-300 hover:border-emerald-400/40 hover:text-white transition-all"
                >
                  <span>{h.domain}</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    {h.score}/100
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="py-24 max-w-lg mx-auto text-center">
        <div className="inline-flex p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Scan could not be completed</h2>
        <p className="mt-3 text-sm text-mute leading-relaxed">{error}</p>
        <button
          onClick={reset}
          className="btn-primary mt-8 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-semibold uppercase tracking-wider"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Try another domain</span>
        </button>
      </div>
    );
  }

  const s = score(findings);
  const count = (sev: Finding["severity"]) => findings.filter((f) => f.severity === sev).length;

  const sortedRows = status === "done" ? [...findings].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]) : findings;
  const filteredRows = filter === "all" ? sortedRows : sortedRows.filter((f) => f.severity === filter);

  const print = () => {
    setTab("findings");
    setTimeout(() => window.print(), 250);
  };

  return (
    <div className="grid gap-8 py-8 lg:grid-cols-[330px_1fr]">
      {/* Left Sidebar: Score HUD & Live Telemetry Feed */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="glass-panel rounded-3xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <button
              data-noprint
              onClick={reset}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-mute hover:text-white transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span>New Scan</span>
            </button>
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {status === "scanning" ? "Scanning..." : "Complete"}
            </span>
          </div>

          <p className="mt-4 break-all text-base font-bold text-white">{domain}</p>

          <div className="mt-5">
            <ScoreRing value={s} />
          </div>

          {/* Counts Matrix */}
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
            <button
              onClick={() => setFilter("critical")}
              className={`rounded-2xl border p-2.5 transition-all ${
                filter === "critical"
                  ? "border-red-500 bg-red-500/20 text-red-300"
                  : "border-red-500/20 bg-red-500/10 text-red-400 hover:border-red-500/40"
              }`}
            >
              <span className="block text-lg font-black">{count("critical")}</span>
              <span className="text-[10px] uppercase font-semibold">Critical</span>
            </button>

            <button
              onClick={() => setFilter("warn")}
              className={`rounded-2xl border p-2.5 transition-all ${
                filter === "warn"
                  ? "border-amber-500 bg-amber-500/20 text-amber-300"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-400 hover:border-amber-500/40"
              }`}
            >
              <span className="block text-lg font-black">{count("warn")}</span>
              <span className="text-[10px] uppercase font-semibold">Warnings</span>
            </button>

            <button
              onClick={() => setFilter("pass")}
              className={`rounded-2xl border p-2.5 transition-all ${
                filter === "pass"
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/40"
              }`}
            >
              <span className="block text-lg font-black">{count("pass")}</span>
              <span className="text-[10px] uppercase font-semibold">Passed</span>
            </button>
          </div>

          {/* Comparison Delta */}
          {status === "done" && previous !== null && (
            <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs text-mute text-center">
              {s === previous ? (
                "Score unchanged from last scan."
              ) : (
                <span className={s > previous ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                  {s > previous ? "▲" : "▼"} {Math.abs(s - previous)} pts vs previous audit ({previous}/100)
                </span>
              )}
            </div>
          )}

          {/* Rive ScanPortal Animation while scanning */}
          <motion.div
            data-noprint
            className="overflow-hidden"
            initial={{ height: 210 }}
            animate={{ height: status === "done" ? 0 : 210 }}
            transition={{ delay: status === "done" ? 2 : 0, duration: 0.5 }}
          >
            <ScanPortal className="mt-4 h-52 w-full" phase={status === "scanning" ? "scanning" : "done"} tick={findings.length} />
          </motion.div>
        </div>
      </aside>

      {/* Right Column: Tabbed Findings, Fix Kit, Action Plan */}
      <section>
        {/* Navigation Tabs */}
        <div data-noprint role="tablist" className="mb-6 flex gap-2 overflow-x-auto border-b border-white/[0.08] pb-px">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`relative whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                tab === id ? "text-white" : "text-mute hover:text-slate-200"
              }`}
            >
              {label}
              {tab === id && (
                <motion.span
                  layoutId="scan-tab-underline"
                  className="absolute inset-x-2 -bottom-[1px] h-[2px] bg-emerald-400 shadow-[0_0_10px_#00f2b4]"
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Panes */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "findings" && (
            <div className="space-y-4">
              <CategoryBars findings={findings} />

              {/* Filter Pills */}
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-mute">
                  Detected Findings ({filteredRows.length})
                </span>
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setFilter("all")}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                      filter === "all" ? "bg-white/10 text-white" : "text-mute hover:text-white"
                    }`}
                  >
                    All ({findings.length})
                  </button>
                  <button
                    onClick={() => setFilter("critical")}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                      filter === "critical" ? "bg-red-500/20 text-red-400" : "text-mute hover:text-red-400"
                    }`}
                  >
                    Critical ({count("critical")})
                  </button>
                  <button
                    onClick={() => setFilter("warn")}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                      filter === "warn" ? "bg-amber-500/20 text-amber-400" : "text-mute hover:text-amber-400"
                    }`}
                  >
                    Warnings ({count("warn")})
                  </button>
                  <button
                    onClick={() => setFilter("pass")}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                      filter === "pass" ? "bg-emerald-500/20 text-emerald-400" : "text-mute hover:text-emerald-400"
                    }`}
                  >
                    Passed ({count("pass")})
                  </button>
                </div>
              </div>

              {/* Findings List (Screen 2 -> Screen 3 interaction) */}
              <div className="glass-panel rounded-3xl overflow-hidden divide-y divide-white/[0.06]">
                {filteredRows.map((f) => (
                  <FindingRow key={f.id} f={f} onOpen={() => setOpen(f)} />
                ))}
              </div>

              {status === "scanning" && filteredRows.length === 0 && (
                <div className="glass-panel rounded-3xl p-12 text-center text-mute flex flex-col items-center justify-center gap-3">
                  <Activity className="h-6 w-6 animate-spin text-emerald-400" />
                  <span className="text-sm">Connecting to {domain} and reading public headers...</span>
                </div>
              )}
            </div>
          )}

          {tab === "kit" && <FixKit findings={findings} />}
          {tab === "plan" && <ActionPlan domain={domain} findings={findings} onOpen={setOpen} />}
          {tab === "export" && <ExportPanel domain={domain} findings={findings} onPrint={print} />}
        </motion.div>
      </section>

      {/* Slide-over Detailed Remediation Panel (Screen 3) */}
      <AnimatePresence>
        {open && <DetailsPanel key={open.id} f={open} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </div>
  );
}
