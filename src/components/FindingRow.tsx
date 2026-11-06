"use client";
import { motion } from "motion/react";
import type { Finding } from "@/lib/types";
import { SEV } from "@/lib/severity";
import { ChevronRight, AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

export function FindingRow({ f, onOpen }: { f: Finding; onOpen: () => void }) {
  const Icon =
    f.severity === "critical"
      ? AlertCircle
      : f.severity === "warn"
      ? AlertTriangle
      : f.severity === "pass"
      ? CheckCircle2
      : Info;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="relative transition-colors hover:bg-white/[0.04]"
    >
      <span className={`absolute bottom-3 left-0 top-3 w-[3px] rounded-r ${SEV[f.severity].bar}`} />

      <button
        onClick={onOpen}
        className="group flex w-full items-center justify-between gap-4 py-4 pl-6 pr-5 text-left"
      >
        <div className="flex items-start gap-4">
          <div className="mt-0.5 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${SEV[f.severity].badge}`}
            >
              <Icon className="h-3 w-3" />
              <span>{SEV[f.severity].label}</span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                {f.title}
              </span>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-mute uppercase">
                {f.category}
              </span>
            </div>
            <p className="mt-1 text-xs text-mute leading-relaxed max-w-xl">
              {f.found}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-mute group-hover:text-emerald-400 shrink-0 transition-colors">
          <span className="hidden sm:inline">Inspect Fix</span>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </button>
    </motion.div>
  );
}
