"use client";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Shield, Copy, Check, Download, Sliders, Mail, Code2, Sparkles, Server } from "lucide-react";

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<"headers" | "dns">("headers");

  // Headers Config State
  const [hsts, setHsts] = useState(true);
  const [hstsPreload, setHstsPreload] = useState(false);
  const [csp, setCsp] = useState(true);
  const [frameOptions, setFrameOptions] = useState("DENY");
  const [nosniff, setNosniff] = useState(true);
  const [referrer, setReferrer] = useState("strict-origin-when-cross-origin");
  const [serverType, setServerType] = useState<"nginx" | "apache" | "next" | "cloudflare">("nginx");
  const [copiedHeader, setCopiedHeader] = useState(false);

  // DNS Generator State
  const [domain, setDomain] = useState("example.com.bd");
  const [mailProvider, setMailProvider] = useState("google");
  const [dmarcPolicy, setDmarcPolicy] = useState("quarantine");
  const [reportEmail, setReportEmail] = useState("security@example.com.bd");
  const [copiedDns, setCopiedDns] = useState(false);

  // Generate Headers Snippet
  const generateHeaderConfig = () => {
    const headersList: { name: string; value: string }[] = [];

    if (hsts) {
      let val = "max-age=31536000; includeSubDomains";
      if (hstsPreload) val += "; preload";
      headersList.push({ name: "Strict-Transport-Security", value: val });
    }
    if (csp) {
      headersList.push({ name: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'; img-src 'self' data: https:;" });
    }
    if (frameOptions !== "NONE") {
      headersList.push({ name: "X-Frame-Options", value: frameOptions });
    }
    if (nosniff) {
      headersList.push({ name: "X-Content-Type-Options", value: "nosniff" });
    }
    if (referrer) {
      headersList.push({ name: "Referrer-Policy", value: referrer });
    }
    headersList.push({ name: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" });

    if (serverType === "nginx") {
      return headersList.map((h) => `add_header ${h.name} "${h.value}" always;`).join("\n");
    }
    if (serverType === "apache") {
      return `<IfModule mod_headers.c>\n${headersList
        .map((h) => `  Header always set ${h.name} "${h.value}"`)
        .join("\n")}\n</IfModule>`;
    }
    if (serverType === "next") {
      return `// next.config.ts\nconst nextConfig = {\n  async headers() {\n    return [{\n      source: '/(.*)',\n      headers: [\n${headersList
        .map((h) => `        { key: '${h.name}', value: '${h.value}' },`)
        .join("\n")}\n      ],\n    }];\n  },\n};\nexport default nextConfig;`;
    }
    return `// Cloudflare Transform Rule / Worker\nconst securityHeaders = {\n${headersList
      .map((h) => `  "${h.name}": "${h.value}",`)
      .join("\n")}\n};`;
  };

  // Generate DNS Records
  const spfInclude =
    mailProvider === "google"
      ? "_spf.google.com"
      : mailProvider === "microsoft"
      ? "spf.protection.outlook.com"
      : mailProvider === "zoho"
      ? "zoho.com"
      : "_spf.mailhost.com";

  const spfRecord = `v=spf1 include:${spfInclude} ~all`;
  const dmarcRecord = `v=DMARC1; p=${dmarcPolicy}; rua=mailto:${reportEmail || "admin@" + domain}`;

  const copyText = (txt: string, isDns: boolean) => {
    navigator.clipboard.writeText(txt).then(() => {
      if (isDns) {
        setCopiedDns(true);
        setTimeout(() => setCopiedDns(false), 2000);
      } else {
        setCopiedHeader(true);
        setTimeout(() => setCopiedHeader(false), 2000);
      }
    });
  };

  return (
    <div className="pb-24 pt-6">
      <PageHeader
        eyebrow="Developer Productivity Suite"
        title={<>Interactive Hardening &amp; <span className="text-gradient">Config Generators.</span></>}
      >
        Configure defensive rules interactively. Instantly generate validated, drop-in configurations for your servers and DNS providers.
      </PageHeader>

      {/* Mode Switcher */}
      <div className="mt-8 flex gap-2 border-b border-white/[0.08] pb-4">
        <button
          onClick={() => setActiveTab("headers")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "headers"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-mute hover:text-white"
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Security Header Generator</span>
        </button>
        <button
          onClick={() => setActiveTab("dns")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "dns"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-mute hover:text-white"
          }`}
        >
          <Mail className="h-4 w-4" />
          <span>SPF &amp; DMARC DNS Builder</span>
        </button>
      </div>

      {/* Tab 1: Interactive Security Header Generator */}
      {activeTab === "headers" && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          {/* Controls Panel */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-emerald-400" />
              <span>Select Defensive Controls</span>
            </h3>

            {/* HSTS */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm font-bold text-white block">Strict-Transport-Security (HSTS)</span>
                  <span className="text-xs text-mute">Force all traffic over HTTPS for 1 year</span>
                </div>
                <input
                  type="checkbox"
                  checked={hsts}
                  onChange={(e) => setHsts(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-400"
                />
              </label>
              {hsts && (
                <label className="mt-3 flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-2 border-t border-white/[0.04]">
                  <input
                    type="checkbox"
                    checked={hstsPreload}
                    onChange={(e) => setHstsPreload(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-emerald-400"
                  />
                  <span>Include browser preload list token</span>
                </label>
              )}
            </div>

            {/* CSP */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm font-bold text-white block">Content-Security-Policy (CSP)</span>
                  <span className="text-xs text-mute">Restrict script sources to self and trusted origins</span>
                </div>
                <input
                  type="checkbox"
                  checked={csp}
                  onChange={(e) => setCsp(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-400"
                />
              </label>
            </div>

            {/* X-Frame-Options */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white block">Clickjacking Protection</span>
                  <span className="text-xs text-mute">X-Frame-Options framing rule</span>
                </div>
                <select
                  value={frameOptions}
                  onChange={(e) => setFrameOptions(e.target.value)}
                  className="rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-400"
                >
                  <option value="DENY">DENY (Strict)</option>
                  <option value="SAMEORIGIN">SAMEORIGIN</option>
                  <option value="NONE">Disabled</option>
                </select>
              </div>
            </div>

            {/* Nosniff */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm font-bold text-white block">MIME Type Protection (nosniff)</span>
                  <span className="text-xs text-mute">Prevent browsers executing uploaded files as code</span>
                </div>
                <input
                  type="checkbox"
                  checked={nosniff}
                  onChange={(e) => setNosniff(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-400"
                />
              </label>
            </div>
          </div>

          {/* Generated Code Output */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <span className="text-xs font-bold uppercase tracking-wider text-mute">Target Platform</span>
                <div className="flex gap-1.5">
                  {(["nginx", "apache", "next", "cloudflare"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setServerType(s)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold uppercase transition-all ${
                        serverType === s
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "text-mute hover:text-white"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Box */}
              <div className="relative mt-4 rounded-2xl border border-white/[0.08] bg-black/90 p-4">
                <pre className="overflow-x-auto font-mono text-xs text-emerald-300 leading-relaxed min-h-[220px]">
                  <code>{generateHeaderConfig()}</code>
                </pre>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between pt-4 border-t border-white/[0.08]">
              <span className="text-xs text-mute">Drop-in configuration ready</span>
              <button
                onClick={() => copyText(generateHeaderConfig(), false)}
                className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
              >
                {copiedHeader ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedHeader ? "Copied" : "Copy Configuration"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: SPF & DMARC DNS Record Generator */}
      {activeTab === "dns" && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Inputs */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-emerald-400" />
              <span>Email Service Specifications</span>
            </h3>

            <div>
              <label className="text-xs font-semibold text-mute block mb-1">Root Domain</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-mute block mb-1">Mail Infrastructure Provider</label>
              <select
                value={mailProvider}
                onChange={(e) => setMailProvider(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-400"
              >
                <option value="google">Google Workspace (Gmail)</option>
                <option value="microsoft">Microsoft 365 (Office 365)</option>
                <option value="zoho">Zoho Mail</option>
                <option value="other">Generic Mail Gateway</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-mute block mb-1">DMARC Enforcement Policy</label>
              <select
                value={dmarcPolicy}
                onChange={(e) => setDmarcPolicy(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-400"
              >
                <option value="quarantine">p=quarantine (Direct spoofed emails to Spam)</option>
                <option value="reject">p=reject (Block spoofed emails completely)</option>
                <option value="none">p=none (Monitor only)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-mute block mb-1">Security Incident Reporting Email</label>
              <input
                type="text"
                value={reportEmail}
                onChange={(e) => setReportEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Generated DNS Records */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-6">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Record 1: SPF (TXT)</span>
                <span className="text-xs text-mute">Host: @</span>
              </div>
              <div className="relative mt-3 rounded-2xl border border-white/[0.08] bg-black/80 p-3.5 font-mono text-xs text-emerald-300">
                <code>{spfRecord}</code>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Record 2: DMARC (TXT)</span>
                <span className="text-xs text-mute">Host: _dmarc.{domain}</span>
              </div>
              <div className="relative mt-3 rounded-2xl border border-white/[0.08] bg-black/80 p-3.5 font-mono text-xs text-cyan-300">
                <code>{dmarcRecord}</code>
              </div>
            </div>

            <button
              onClick={() => copyText(`${domain} TXT "${spfRecord}"\n_dmarc.${domain} TXT "${dmarcRecord}"`, true)}
              className="btn-primary w-full rounded-2xl py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {copiedDns ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copiedDns ? "Both Records Copied" : "Copy Both DNS TXT Records"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
