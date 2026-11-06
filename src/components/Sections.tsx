"use client";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useScanCtx } from "./ScanProvider";
import { DEMO } from "@/lib/site";
import { Shield, Lock, Globe, Server, FileCode, CheckCircle2, ArrowRight, Mail, Eye, Key } from "lucide-react";

const WORDS = [
  "TLS 1.3 PROTOCOL",
  "HSTS ENFORCEMENT",
  "CONTENT-SECURITY-POLICY",
  "X-FRAME-OPTIONS",
  "CORS ORIGIN ISOLATION",
  "COOKIE SAMESITE/SECURE",
  "PHP VERSION EXPOSURE",
  "SPF ANTI-SPOOFING",
  "DMARC POLICY",
  "SECURITY.TXT CONTACT",
];

export function Marquee() {
  const row = [...WORDS, ...WORDS];
  return (
    <div className="overflow-hidden border-y border-white/[0.08] bg-black/40 py-3.5 [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]">
      <div className="marquee-track flex w-max gap-8 font-mono text-[11px] uppercase tracking-[0.2em] text-mute">
        {row.map((w, i) => (
          <span key={i} className="flex items-center gap-8">
            <span className="hover:text-emerald-400 transition-colors">{w}</span>
            <span className="text-emerald-400 text-[8px]">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const CHECKS = [
  { t: "HTTPS Upgrade", d: "Forces encrypted connections.", tag: "Transport", icon: Lock, color: "text-cyan-400" },
  { t: "TLS Certificate", d: "Validates expiration and crypto suites.", tag: "Transport", icon: Shield, color: "text-cyan-400" },
  { t: "Defensive Headers", d: "CSP, HSTS, and clickjacking protection.", tag: "Headers", icon: Globe, color: "text-emerald-400" },
  { t: "Version Leakage", d: "Flags exposed PHP and server banners.", tag: "Exposure", icon: Server, color: "text-red-400" },
  { t: "CORS Permissions", d: "Stops untrusted sites reading session data.", tag: "Exposure", icon: Eye, color: "text-red-400" },
  { t: "Cookie Security", d: "Enforces HttpOnly, Secure, and SameSite.", tag: "Sessions", icon: Key, color: "text-emerald-400" },
  { t: "Email Anti-Spoofing", d: "Audits SPF & DMARC against impersonation.", tag: "Email", icon: Mail, color: "text-amber-400" },
  { t: "Security Contact", d: "RFC 9116 security.txt disclosure.", tag: "Process", icon: FileCode, color: "text-indigo-400" },
];

export function Checks() {
  return (
    <section id="checks" className="py-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Automated Audit Scope
          </span>
          <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-white">
            8 Critical Attack Vectors Audited
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-mute max-w-sm">
          Everything is tested passively via public HTTP and DNS records. Zero intrusion.
        </p>
      </div>

      <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
        {CHECKS.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.t}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 4) * 0.05 }}
              className="glass-panel rounded-2xl p-4 sm:p-5 hover:border-emerald-400/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <Icon className={`h-5 w-5 ${c.color}`} />
                <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[9px] font-bold uppercase text-mute">
                  {c.tag}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-bold text-white">{c.t}</h3>
              <p className="mt-1 text-xs text-mute leading-snug">{c.d}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    { n: "01", t: "Enter Any URL", d: "Test your site or any public demo in one click." },
    { n: "02", t: "Passive Recon", d: "Reads headers and DNS records without sending exploit payloads." },
    { n: "03", t: "1-Click Fixes", d: "Copy drop-in configs for Nginx, Apache, Next.js, and Cloudflare." },
  ];

  return (
    <section id="how" className="py-16 border-t border-white/[0.06]">
      <div className="text-center max-w-xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
          Streamlined Workflow
        </span>
        <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">
          From Audit to Fix in 3 Steps
        </h2>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.n} className="glass-panel rounded-3xl p-6 text-center">
            <span className="inline-block text-3xl font-black text-emerald-400 mb-3">{s.n}</span>
            <h3 className="text-base font-bold text-white">{s.t}</h3>
            <p className="mt-2 text-xs sm:text-sm text-mute leading-relaxed">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DemoBand() {
  const { setInput, setConsent } = useScanCtx();
  const router = useRouter();

  const pick = (d: string) => {
    setInput(d);
    setConsent(true);
    router.push("/scan");
  };

  return (
    <section id="demo" className="pb-20">
      <div className="glass-panel relative overflow-hidden rounded-3xl p-8 sm:p-10 border border-emerald-500/30 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Try It Instantly
          </span>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white">
            Audit an unhardened site, then see the fix.
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-mute max-w-lg">
            We maintain reference targets showing common vulnerabilities (missing HSTS, exposed PHP) and a hardened version.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => pick(DEMO.before)}
            className="btn-primary rounded-full px-6 py-3 text-xs font-bold uppercase tracking-wider"
          >
            Scan Weak Demo
          </button>
          <button
            onClick={() => pick(DEMO.after)}
            className="btn-secondary rounded-full px-5 py-3 text-xs font-semibold"
          >
            Scan Hardened Demo
          </button>
        </div>
      </div>
    </section>
  );
}
