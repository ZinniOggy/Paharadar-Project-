"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import type { Finding } from "@/lib/types";
import { SEV } from "@/lib/severity";
import { X, Copy, Check, ExternalLink, BookOpen, ShieldAlert, Code2 } from "lucide-react";

export function DetailsPanel({ f, onClose }: { f: Finding; onClose: () => void }) {
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fix = f.fix?.[tab];
  const copy = () => {
    if (!fix) return;
    navigator.clipboard.writeText(fix.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      {/* Dimmed Translucent Backdrop */}
      <motion.div
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Slide-over Drawer */}
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={f.title}
        className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#06080d]/95 backdrop-blur-3xl p-6 sm:p-8 shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <span className="text-xs font-semibold uppercase tracking-wider text-mute">
            Issue Inspection · {f.id}
          </span>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-mute hover:border-white/20 hover:text-white transition-colors"
          >
            <span>Close</span>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Severity & Title */}
        <div className="mt-6">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${SEV[f.severity].badge}`}
          >
            {SEV[f.severity].label}
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {f.title}
          </h2>
        </div>

        {/* What was detected */}
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-1.5">
            Observed Finding
          </span>
          <p className="text-sm text-slate-200 leading-relaxed">{f.found}</p>
        </div>

        {/* Why it matters */}
        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1.5">
            Why It Matters
          </span>
          <p className="text-sm text-mute leading-relaxed">{f.why}</p>
        </div>

        {/* Multi-platform Fix Code */}
        {f.fix && f.fix.length > 0 && (
          <div className="mt-6">
            <span className="text-xs font-bold uppercase tracking-wider text-white block mb-3">
              How to Fix (Drop-in Configuration)
            </span>

            {/* Server tabs */}
            <div className="flex gap-2 overflow-x-auto border-b border-white/[0.08] pb-2">
              {f.fix.map((x, i) => (
                <button
                  key={x.label}
                  onClick={() => setTab(i)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    i === tab
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold"
                      : "text-mute hover:text-white hover:bg-white/5"
                  }`}
                >
                  {x.label}
                </button>
              ))}
            </div>

            {/* Code Box */}
            <div className="relative mt-3 rounded-2xl border border-white/[0.08] bg-black/80 p-4">
              <pre className="overflow-x-auto font-mono text-xs text-emerald-300 leading-relaxed pr-14">
                <code>{fix?.code}</code>
              </pre>

              <button
                onClick={copy}
                className="absolute right-3 top-3 flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-emerald-400/40 hover:text-emerald-300 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Links */}
        <div className="mt-8 space-y-2.5 border-t border-white/[0.08] pt-6 text-xs">
          {f.docs && (
            <a
              href={f.docs}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl border border-white/10 p-3.5 text-slate-300 hover:border-emerald-400/30 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-emerald-400" />
                <span>Read Official Security Documentation</span>
              </span>
              <span>→</span>
            </a>
          )}

          {f.learn && (
            <Link
              href={`/learn/${f.learn}`}
              onClick={onClose}
              className="flex items-center justify-between rounded-xl border border-white/10 p-3.5 text-slate-300 hover:border-emerald-400/30 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-cyan-400" />
                <span>Read Plain-Language Security Explainer</span>
              </span>
              <span>→</span>
            </Link>
          )}
        </div>
      </motion.aside>
    </>
  );
}
