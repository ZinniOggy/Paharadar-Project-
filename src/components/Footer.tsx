import Link from "next/link";
import { Shield, Lock } from "lucide-react";

export function Footer() {
  return (
    <footer data-noprint className="relative z-10 border-t border-white/[0.08] bg-black/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6 py-12 text-xs text-mute">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          {/* Brand Col */}
          <div>
            <div className="flex items-center gap-2 text-white">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="font-bold tracking-tight text-sm">Paharadar</span>
            </div>
            <p className="mt-3 leading-relaxed max-w-sm text-slate-300">
              A passive website security auditor and intelligence tool built for Bangladesh digital assets. Zero invasive payload injection. Analyzes only public HTTP/TLS and DNS telemetry.
            </p>
            <div className="mt-4 flex items-center gap-3 text-[11px] text-emerald-400 font-medium">
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" /> RFC 9116 Compliant
              </span>
              <span>·</span>
              <span>SSRF Sandboxed</span>
            </div>
          </div>

          {/* Core Modules */}
          <div>
            <span className="font-bold uppercase tracking-wider text-white block mb-3">Core Features</span>
            <ul className="space-y-2">
              <li><Link href="/scan" className="hover:text-emerald-400 transition-colors">Target Vulnerability Scanner</Link></li>
              <li><Link href="/compare" className="hover:text-emerald-400 transition-colors">Side-by-Side Comparison Matrix</Link></li>
              <li><Link href="/tools" className="hover:text-emerald-400 transition-colors">Interactive Config Generator</Link></li>
              <li><Link href="/citizens" className="hover:text-emerald-400 transition-colors">Citizen Phishing Radar</Link></li>
              <li><Link href="/history" className="hover:text-emerald-400 transition-colors">Audit History Dashboard</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <span className="font-bold uppercase tracking-wider text-white block mb-3">Resources &amp; API</span>
            <ul className="space-y-2">
              <li><Link href="/api-docs" className="hover:text-emerald-400 transition-colors">Interactive API Console</Link></li>
              <li><Link href="/learn" className="hover:text-emerald-400 transition-colors">Security Hardening Guides</Link></li>
              <li><Link href="/about" className="hover:text-emerald-400 transition-colors">About &amp; Architecture</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.08] pt-6 text-[11px] sm:flex-row text-mute">
          <p>© 2026 Paharadar. Built for authorized security assessment only.</p>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300">System Online</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
