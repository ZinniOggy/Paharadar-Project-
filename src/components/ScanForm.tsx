"use client";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useScanCtx } from "./ScanProvider";
import { DEMO } from "@/lib/site";
import { Search, Globe, ArrowRight, ShieldCheck, Check } from "lucide-react";

export function ScanForm({ className = "" }: { className?: string }) {
  const { input, setInput, consent, setConsent, start } = useScanCtx();
  const router = useRouter();
  const ready = consent && input.trim().length > 0;

  return (
    <form
      className={`glass-panel rounded-3xl p-5 sm:p-6 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (start()) router.push("/scan");
      }}
    >
      <label htmlFor="domain-input" className="block text-xs font-semibold uppercase tracking-wider text-mute mb-2">
        Target Website Address
      </label>

      {/* Main URL Input Container */}
      <div className="relative flex items-center rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 transition-all focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20">
        <Globe className="h-5 w-5 text-mute shrink-0 mr-3" />
        <input
          id="domain-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. example.com.bd"
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-mute/50 outline-none"
        />
        <motion.button
          type="submit"
          disabled={!ready}
          whileHover={ready ? { scale: 1.02 } : undefined}
          whileTap={ready ? { scale: 0.98 } : undefined}
          className="btn-primary shrink-0 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 ml-2"
        >
          <span>Scan</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </motion.button>
      </div>

      {/* Consent Checkbox */}
      <label className="mt-4 flex items-start gap-3 cursor-pointer select-none text-xs text-mute hover:text-slate-200 transition-colors">
        <div className="relative flex items-center mt-0.5">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="peer h-4 w-4 rounded border-white/20 bg-black/60 checked:bg-emerald-400 checked:border-emerald-400 transition-all cursor-pointer accent-emerald-400"
          />
        </div>
        <span className="leading-relaxed">
          I confirm that I own this website or have explicit authorization to perform a passive security assessment.
        </span>
      </label>

      {/* Fast Pre-loaded Targets */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[0.08] pt-4 text-xs">
        <span className="text-mute font-medium">Quick Test:</span>
        <button
          type="button"
          onClick={() => {
            setInput(DEMO.before);
            setConsent(true);
          }}
          className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
        >
          Weak Demo (EOL PHP 7.4)
        </button>
        <button
          type="button"
          onClick={() => {
            setInput(DEMO.after);
            setConsent(true);
          }}
          className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          Hardened Demo (All Passes)
        </button>
      </div>
    </form>
  );
}
