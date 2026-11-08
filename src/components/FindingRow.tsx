"use client";
import { motion } from "motion/react";
import type { Finding } from "@/lib/types";
import { SEV } from "@/lib/severity";
import { ChevronRight, AlertCircle, AlertTriangle, CheckCircle2, Info, HelpCircle } from "lucide-react";

export function FindingRow({ f, onOpen }: { f: Finding; onOpen: () => void }) {
  const Icon =
    f.severity === "critical"
      ? AlertCircle
      : f.severity === "warn"
      ? AlertTriangle
      : f.severity === "pass"
      ? CheckCircle2
      : f.severity === "inconclusive"
      ? HelpCircle
      : Info;

  const sevMeta = SEV[f.severity] ?? SEV.info;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="relative transition-colors hover:bg-white/[0.04]"
    >
      <span className={`absolute bottom-3 left-0 top-3 w-[3px] rounded-r ${sevMeta.bar}`} />

      <button
        onClick={onOpen}
        className="group flex w-full items-center justify-between gap-4 py-4 pl-6 pr-5 text-left"
      >
        <div className="flex items-start gap-4">
          <div className="mt-0.5 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${sevMeta.badge}`}
            >
              <Icon className="h-3 w-3" />
              <span>{sevMeta.label}</span>
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                {f.title}
              </span>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-mute uppercase">
                {f.category}
              </span>
              {/* Calibrated Score Impact */}
              {f.scoreImpact !== undefined && (
                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                    f.scoreImpact < 0
                      ? f.scoreImpact <= -15
                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  {f.scoreImpact === 0 ? "0 pts impact" : `${f.scoreImpact} pts`}
                </span>
              )}
              {f.evidence?.status && (
                <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                  {String(f.evidence.status)}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-mute leading-relaxed max-w-xl">
              {f.found}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-mute group-hover:text-emerald-400 shrink-0 transition-colors">
          <span className="hidden sm:inline">Inspect Evidence</span>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </button>
    </motion.div>
  );
}
