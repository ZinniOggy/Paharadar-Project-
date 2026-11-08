"use client";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useScanCtx } from "./ScanProvider";
import { DEMO } from "@/lib/site";
import { Globe, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export function ScanForm({ className = "" }: { className?: string }) {
  const { input, setInput, consent, setConsent, start } = useScanCtx();
  const router = useRouter();

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    // Auto-confirm consent on explicit button click
    setConsent(true);
    if (start(input.trim())) {
      router.push("/scan");
    }
  };

  return (
    <form
      className={`glass-panel rounded-3xl p-6 sm:p-7 ${className}`}
      onSubmit={handleSubmit}
    >
      <div className="flex items-center justify-between mb-2.5">
        <label htmlFor="domain-input" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
          Target Website Address
        </label>
        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          Passive Audit · Non-Invasive
        </span>
      </div>

      {/* Main URL Input Container */}
      <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl border-2 border-emerald-500/30 bg-black/80 p-2 transition-all focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-400/20 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center flex-1 px-3 py-2">
          <Globe className="h-5 w-5 text-emerald-400 shrink-0 mr-3" />
          <input
            id="domain-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. example.com.bd or your-domain.com"
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-slate-500 font-mono outline-none"
          />
        </div>

        {/* ULTRA-VISIBLE BOLD SCAN BUTTON */}
        <motion.button
          type="submit"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-black font-black text-xs sm:text-sm uppercase tracking-wider py-3.5 px-6 shadow-[0_0_25px_rgba(0,242,180,0.6)] cursor-pointer transition-all"
        >
          <Zap className="h-4 w-4 fill-black" />
          <span>SCAN NOW</span>
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Consent Checkbox */}
      <label className="mt-4 flex items-start gap-3 cursor-pointer select-none text-xs text-slate-300 hover:text-white transition-colors">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="h-4 w-4 mt-0.5 rounded border-white/20 bg-black/60 checked:bg-emerald-400 checked:border-emerald-400 transition-all cursor-pointer accent-emerald-400"
        />
        <span className="leading-relaxed">
          I confirm that I own this website or have explicit authorization to perform a passive security assessment.
        </span>
      </label>

      {/* Fast Pre-loaded Targets */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[0.08] pt-4 text-xs">
        <span className="text-slate-400 font-bold">Quick Demos:</span>
        <button
          type="button"
          onClick={() => {
            setInput(DEMO.before);
            setConsent(true);
          }}
          className="rounded-full border border-red-500/40 bg-red-500/15 px-3.5 py-1 text-[11px] font-bold text-red-300 hover:bg-red-500/30 transition-all shadow-[0_0_10px_rgba(239,68,68,0.2)]"
        >
          Weak Demo (EOL PHP 7.4)
        </button>
        <button
          type="button"
          onClick={() => {
            setInput(DEMO.after);
            setConsent(true);
          }}
          className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/30 transition-all shadow-[0_0_10px_rgba(0,242,180,0.2)]"
        >
          Hardened Demo (All Passes)
        </button>
      </div>
    </form>
  );
}
