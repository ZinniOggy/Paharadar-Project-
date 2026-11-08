"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ScoreRing } from "./ScoreRing";
import { FindingRow } from "./FindingRow";
import { DetailsPanel } from "./DetailsPanel";
import { ScanPortal } from "./ScanPortal";
import { CategoryBars, FixKit, ActionPlan, ExportPanel } from "./ResultTabs";
import type { Finding } from "@/lib/types";
import { RefreshCw, Activity, PlusCircle, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Props {
  domain: string;
  findings: Finding[];
  status: "idle" | "scanning" | "done" | "error";
  score: number;
  previous: number | null;
  reset: () => void;
}

type Tab = "findings" | "kit" | "plan" | "export";
const TABS: [Tab, string][] = [
  ["findings", "Findings"],
  ["kit", "Fix Kit"],
  ["plan", "Action Plan"],
  ["export", "Export Report"],
];

export function ScanView({
  domain,
  findings,
  status,
  score: s,
  previous,
  reset,
}: Props) {
  const [tab, setTab] = useState<Tab>("findings");
  const [open, setOpen] = useState<Finding | null>(null);
  const [filter, setFilter] = useState<"all" | "critical" | "warn" | "pass">("all");

  const count = (sev: Finding["severity"]) =>
    findings.filter((f) => f.severity === sev).length;

  const filteredRows = findings.filter((f) => {
    if (filter === "all") return true;
    return f.severity === filter;
  });

  const print = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div className="grid gap-8 py-8 lg:grid-cols-[330px_1fr]">
      {/* Left Sidebar: Score HUD & Live Telemetry Feed */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="glass-panel rounded-3xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-mute">
              Target Telemetry
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {status === "scanning" ? "Scanning..." : "Complete"}
            </span>
          </div>

                    <p className="mt-4 break-all text-base font-bold text-white">{domain}</p>

          {/* Fresh Live Telemetry Indicator */}
          <div className="mt-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Scan · Fresh Telemetry
            </span>
            <span className="text-[10px] font-mono text-mute">Zero Stale Cache</span>
          </div>

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

          {/* PROMINENT BOLD NEW SCAN BUTTON IN SIDEBAR */}
          <button
            data-noprint
            onClick={reset}
            className="w-full mt-5 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-black font-extrabold text-xs uppercase tracking-wider py-3.5 px-4 shadow-[0_0_25px_rgba(0,242,180,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Audit New Website</span>
          </button>

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
        {/* Navigation Tabs + Bold New Scan Pill */}
        <div data-noprint className="mb-6 flex items-center justify-between border-b border-white/[0.08] pb-px">
          <div role="tablist" className="flex gap-2 overflow-x-auto no-scrollbar sm:overflow-visible">
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

          {/* Header Action: Start New Scan */}
          <button
            data-noprint
            onClick={reset}
            className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-400 transition-all shadow-[0_0_15px_rgba(0,242,180,0.25)]"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Scan</span>
          </button>
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

              {/* Findings List */}
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

              {/* AUDIT COMPLETE BANNER WITH BOLD NEW SCAN ACTION */}
              {status === "done" && (
                <div className="glass-panel rounded-3xl p-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-black to-cyan-950/30">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shadow-[0_0_15px_rgba(0,242,180,0.3)]">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Assessment Complete for {domain}</h4>
                      <p className="text-xs text-mute">Export your report, copy server fix configurations, or scan a new domain.</p>
                    </div>
                  </div>
                  <button
                    onClick={reset}
                    className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-black font-black text-xs uppercase tracking-wider px-5 py-3 shadow-[0_0_20px_rgba(0,242,180,0.5)] transition-all hover:scale-105 active:scale-95"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Scan Another Site</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "kit" && <FixKit findings={findings} />}
          {tab === "plan" && <ActionPlan domain={domain} findings={findings} onOpen={setOpen} />}
          {tab === "export" && <ExportPanel domain={domain} findings={findings} onPrint={print} />}
        </motion.div>
      </section>

      {/* Slide-over Detailed Remediation Panel */}
      <AnimatePresence>
        {open && <DetailsPanel key={open.id} f={open} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </div>
  );
}
