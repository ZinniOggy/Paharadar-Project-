"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import type { Finding } from "@/lib/types";
import { SEV } from "@/lib/severity";
import { X, Copy, Check, ExternalLink, BookOpen, Terminal, ShieldCheck } from "lucide-react";

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
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
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

        {/* Severity, Score Impact & Title */}
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${SEV[f.severity].badge}`}
          >
            {SEV[f.severity].label}
          </span>
          {f.scoreImpact !== undefined && (
            <span
              className={`rounded-full border px-3 py-1 text-xs font-mono font-bold ${
                f.scoreImpact < 0
                  ? f.scoreImpact <= -15
                    ? "border-red-500/40 bg-red-500/15 text-red-300"
                    : "border-amber-500/40 bg-amber-500/15 text-amber-300"
                  : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
              }`}
            >
              Score Impact: {f.scoreImpact === 0 ? "0 pts (No penalty)" : `${f.scoreImpact} pts`}
            </span>
          )}
          <h2 className="w-full mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
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

        {/* Technical Telemetry & Evidence (As requested by reviewers) */}
        {f.evidence && (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-black/70 p-5 space-y-3.5 shadow-[0_0_20px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Technical Telemetry & Evidence
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                  <span className="h-1 w-1 rounded-full bg-emerald-400" />
                  {f.evidence.dataFreshness === "cached" ? "Cached Audit" : "Fresh Live Probe"}
                </span>
                <span className="text-[10px] font-mono text-mute">{f.evidence.timestamp}</span>
              </div>
            </div>

            {/* Test performed & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-mute block text-[10px] uppercase font-bold mb-0.5">Test Performed</span>
                <span className="font-mono text-slate-200 break-words">{f.evidence.test}</span>
              </div>
              <div>
                <span className="text-mute block text-[10px] uppercase font-bold mb-0.5">HTTP / Network Status</span>
                <span className="font-mono font-bold text-emerald-400">{String(f.evidence.status ?? "N/A")}</span>
              </div>
            </div>

            {/* Tested Resolved IPs (Categorized into IPv4, Native IPv6, NAT64) */}
            {f.evidence.ipDetails && f.evidence.ipDetails.length > 0 ? (
              <div>
                <span className="text-mute block text-[10px] uppercase font-bold mb-1">
                  Tested IP Endpoints ({f.evidence.ipDetails.length} Total · Native vs NAT64)
                </span>
                <div className="flex flex-col gap-1 text-[11px] font-mono">
                  {f.evidence.ipDetails.map((item) => (
                    <div
                      key={item.ip}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                            item.type === "ipv4"
                              ? "bg-blue-500/20 text-blue-300"
                              : item.type === "ipv6-native"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {item.type}
                        </span>
                        <span className="text-slate-200">{item.ip}</span>
                      </div>
                      <span className="text-[10px] text-mute">{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : f.evidence.resolvedIps && f.evidence.resolvedIps.length > 0 ? (
              <div>
                <span className="text-mute block text-[10px] uppercase font-bold mb-1">
                  Resolved IP Infrastructure Tested ({f.evidence.resolvedIps.length} Address{f.evidence.resolvedIps.length > 1 ? "es" : ""})
                </span>
                <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                  {f.evidence.resolvedIps.map((ip) => (
                    <span key={ip} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-cyan-300">
                      {ip}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Multi-Resolver DNS Evidence */}
            {f.evidence.dnsResolvers && f.evidence.dnsResolvers.length > 0 && (
              <div>
                <span className="text-mute block text-[10px] uppercase font-bold mb-1">
                  Multi-Resolver DNS Telemetry ({f.evidence.dnsResolvers.length} Independent Resolvers)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px] font-mono">
                  {f.evidence.dnsResolvers.map((r) => (
                    <div
                      key={r.resolver}
                      className="rounded-lg border border-white/10 bg-black/60 p-2 space-y-0.5"
                    >
                      <span className="text-slate-300 font-bold block truncate">{r.resolver}</span>
                      <span className="text-emerald-400 block">{r.status}</span>
                      <span className="text-mute block">
                        A: {r.ipv4.length} | AAAA: {r.ipv6.length}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            
            {/* Granular DNS Lookups (Query Name, Resolver, RCODE, Timestamp) */}
            {f.evidence.dnsLookups && f.evidence.dnsLookups.length > 0 && (
              <div>
                <span className="text-mute block text-[10px] uppercase font-bold mb-1">
                  Granular DNS Query Log ({f.evidence.dnsLookups.length} Queries Verified)
                </span>
                <div className="flex flex-col gap-1 text-[10px] font-mono">
                  {f.evidence.dnsLookups.map((l, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 gap-2"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="rounded bg-white/10 px-1 py-0.5 text-[9px] font-bold text-white">
                          {l.queryType}
                        </span>
                        <span className="text-slate-200 truncate">{l.queryName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-mute">
                        <span className="text-slate-400">[{l.resolver}]</span>
                        <span
                          className={`font-bold ${
                            l.responseCode === "NOERROR"
                              ? "text-emerald-400"
                              : l.responseCode === "NXDOMAIN"
                              ? "text-amber-400"
                              : "text-red-400"
                          }`}
                        >
                          {l.responseCode}
                        </span>
                        <span>{l.durationMs}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Reason */}
            <div className="rounded-xl bg-white/[0.03] p-3 border border-white/5 text-xs text-slate-300">
              <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">Severity Justification</span>
              <p className="leading-relaxed">{f.evidence.reason}</p>
            </div>

            {/* Captured Response Headers */}
            {f.evidence.headers && Object.keys(f.evidence.headers).length > 0 && (
              <div>
                <span className="text-mute block text-[10px] uppercase font-bold mb-1.5">
                  Captured Response Headers
                </span>
                <pre className="max-h-36 overflow-y-auto rounded-xl bg-black/90 p-3 font-mono text-[11px] text-cyan-300 border border-white/[0.06] leading-relaxed">
                  {Object.entries(f.evidence.headers)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("\n")}
                </pre>
              </div>
            )}

            {/* Captured DNS records */}
            {f.evidence.dnsRecords && f.evidence.dnsRecords.length > 0 && (
              <div>
                <span className="text-mute block text-[10px] uppercase font-bold mb-1.5">
                  DNS Records Returned
                </span>
                <pre className="max-h-28 overflow-y-auto rounded-xl bg-black/90 p-3 font-mono text-[11px] text-emerald-300 border border-white/[0.06] leading-relaxed">
                  {f.evidence.dnsRecords.join("\n")}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Why it matters */}
        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1.5">
            Security Impact & Why It Matters
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
