"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe, Shield, Zap, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import { useScanCtx } from "./ScanProvider";
import { DEMO } from "@/lib/site";

const PRESETS = [
  { label: "Weak Site (PHP 7.4)", url: DEMO.before, tag: "Critical Flaws", color: "text-red-400 border-red-500/30 bg-red-500/10" },
  { label: "Hardened Site", url: DEMO.after, tag: "All Secure", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  { label: "sonalibank.com.bd", url: "sonalibank.com.bd", tag: "Bank Portal", color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
  { label: "daraz.com.bd", url: "daraz.com.bd", tag: "eCommerce", color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10" },
];

export function Hero() {
  const { input, setInput, consent, setConsent, start } = useScanCtx();
  const router = useRouter();

  const handleAudit = (targetUrl?: string) => {
    const urlToUse = targetUrl ?? input;
    if (targetUrl) setInput(targetUrl);
    setConsent(true);
    if (urlToUse.trim()) {
      if (start()) router.push("/scan");
    }
  };

  return (
    <section className="relative pt-10 pb-16 lg:pt-16 lg:pb-24">
      <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Left Column: Punchy Headline & Visual Action Cockpit */}
        <div>
          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-xl"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>Instant Passive Website Security Check</span>
          </motion.div>

          {/* High-Impact Headline (Zero unnecessary paragraphs!) */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="mt-5 text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.05]"
          >
            See what your site <br />
            <span className="text-gradient">reveals to hackers.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-4 max-w-lg text-base sm:text-lg text-slate-300 font-normal leading-relaxed"
          >
            Check SSL certificates, security headers, and email spoofing risks in 3 seconds. Get exact drop-in code fixes.
          </motion.p>

          {/* Interactive Scan Box */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="glass-panel mt-7 rounded-3xl p-3 sm:p-4 shadow-2xl"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAudit();
              }}
              className="flex flex-col sm:flex-row items-center gap-2"
            >
              <div className="flex w-full items-center gap-3 rounded-2xl bg-black/60 px-4 py-3.5 border border-white/10 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 transition-all">
                <Globe className="h-5 w-5 text-emerald-400 shrink-0" />
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter website URL (e.g. yoursite.com.bd)"
                  className="w-full bg-transparent text-sm sm:text-base text-white outline-none placeholder:text-mute/60 font-medium"
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full sm:w-auto shrink-0 rounded-2xl px-7 py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <span>Audit Now</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* Quick 1-Click Interactive Test Targets */}
            <div className="mt-3 flex flex-wrap items-center gap-2 px-1 pt-2 border-t border-white/[0.06] text-xs">
              <span className="text-mute font-semibold mr-1">One-Click Demos:</span>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleAudit(p.url)}
                  className={`rounded-full border px-3 py-1 font-semibold text-[11px] transition-all hover:scale-105 active:scale-95 ${p.color}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* 3 Interactive Quick Stats */}
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-xl">
            <div className="glass-panel rounded-2xl p-3.5 text-center">
              <span className="text-xl sm:text-2xl font-black text-white">0</span>
              <p className="text-[11px] text-mute mt-0.5">Zero Intrusive Attacks</p>
            </div>
            <div className="glass-panel rounded-2xl p-3.5 text-center">
              <span className="text-xl sm:text-2xl font-black text-emerald-400">1-Click</span>
              <p className="text-[11px] text-mute mt-0.5">Copy Code Fixes</p>
            </div>
            <div className="glass-panel rounded-2xl p-3.5 text-center">
              <span className="text-xl sm:text-2xl font-black text-cyan-400">100%</span>
              <p className="text-[11px] text-mute mt-0.5">Private in Browser</p>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Interactive Card (No walls of text!) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative mx-auto w-full max-w-md"
        >
          {/* Card Frame with glassmorphism */}
          <div className="glass-panel relative rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Target Telemetry
                </span>
                <p className="text-base font-bold text-white mt-0.5">demo-target.example.bd</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-500/30 px-3 py-1 text-xs font-bold text-red-400">
                <span>Score: 48/100</span>
              </div>
            </div>

            {/* Quick Interactive findings pills */}
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  <span className="text-white font-medium">HSTS Header Missing</span>
                </div>
                <span className="text-red-400 font-bold uppercase text-[10px]">Critical</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  <span className="text-white font-medium">PHP 7.4 (End-of-Life) Disclosed</span>
                </div>
                <span className="text-red-400 font-bold uppercase text-[10px]">Critical</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-white font-medium">Content-Security-Policy</span>
                </div>
                <span className="text-amber-400 font-bold uppercase text-[10px]">Warning</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-white font-medium">TLS 1.3 Encryption Active</span>
                </div>
                <span className="text-emerald-400 font-bold uppercase text-[10px]">Secure</span>
              </div>
            </div>

            {/* Callout button to test */}
            <button
              onClick={() => handleAudit(DEMO.before)}
              className="mt-5 w-full rounded-2xl bg-white/[0.04] hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-400/40 p-3.5 text-xs font-bold text-slate-200 hover:text-emerald-300 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4 text-emerald-400" />
              <span>Simulate Live Remediation &rarr;</span>
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
