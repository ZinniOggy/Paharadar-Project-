import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Shield, Lock, Server, Cpu, CheckCircle2, AlertTriangle, ArrowRight, Activity, Terminal } from "lucide-react";

export const metadata: Metadata = {
  title: "About Paharadar",
  description: "Mission, architecture, and Bangladesh cyber posture analysis.",
};

const STATS = [
  { value: "100%", label: "Passive Reconnaissance", desc: "Zero intrusive payloads or attacks" },
  { value: "3s", label: "Average Audit Speed", desc: "Streaming NDJSON results" },
  { value: "8+", label: "Security Vectors", desc: "From TLS 1.3 to DMARC" },
  { value: "0", label: "Server-side Logs", desc: "100% private in your browser" },
];

export default function AboutPage() {
  return (
    <div className="pb-24 pt-6">
      <PageHeader
        eyebrow="Mission & Architecture"
        title={<>Defending the web, <span className="text-gradient">one header at a time.</span></>}
      >
        A fast, passive security auditor designed to help developers and businesses in Bangladesh identify external attack surfaces and patch them instantly.
      </PageHeader>

      {/* 4 Big Visual Metric Cards */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="glass-panel rounded-3xl p-6 text-center">
            <span className="text-3xl sm:text-4xl font-black text-emerald-400">{s.value}</span>
            <p className="mt-2 text-sm font-bold text-white">{s.label}</p>
            <p className="mt-1 text-xs text-mute">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* 2 Focused Visual Panels (No walls of text!) */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span>The Bangladesh Context</span>
          </div>
          <h3 className="text-xl font-bold text-white">Why Public Auditing is Crucial</h3>
          <ul className="mt-4 space-y-3 text-xs sm:text-sm text-slate-300">
            <li className="flex items-start gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
              <span>Many local services broadcast outdated software banners (such as unpatched PHP 7.x) which are vulnerable to disclosed exploits.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
              <span>Over 70% of regional portals lack HSTS or DMARC anti-spoofing DNS records, leaving citizens vulnerable to domain impersonation.</span>
            </li>
          </ul>
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
            <Shield className="h-4 w-4" />
            <span>Ethical Design</span>
          </div>
          <h3 className="text-xl font-bold text-white">Safe, Legal &amp; Zero-Exploitation</h3>
          <ul className="mt-4 space-y-3 text-xs sm:text-sm text-slate-300">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Strictly Passive:</strong> Makes standard HTTP/TLS requests identical to any regular browser visit.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>SSRF Sandboxed:</strong> Completely blocks local and private IP addresses (127.0.0.1, 192.168.x.x, 10.x.x.x).</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Fast CTA */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link href="/scan" className="btn-primary rounded-full px-7 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <span>Run Website Scanner</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/api-docs" className="btn-secondary rounded-full px-6 py-3 text-xs font-semibold">
          Explore API Console
        </Link>
      </div>
    </div>
  );
}
