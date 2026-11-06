"use client";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Terminal, Play, Shield, AlertCircle, Copy, Check, Code2, Globe } from "lucide-react";

const ENDPOINT = {
  method: "POST",
  path: "/api/scan",
  contentType: "application/json",
  accept: "application/x-ndjson",
  desc: "Executes a non-invasive passive security reconnaissance scan on a public target domain.",
  safeguards: [
    "RFC 1918 Private IP Blocking (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)",
    "Loopback & Cloud Metadata Isolation (127.0.0.1, 169.254.169.254, ::1)",
    "Port Restrictor: Traffic strictly bound to ports 80 & 443",
    "Max Redirect Depth: Capped at 4 hops with per-hop SSRF validation",
    "Stream Protocol: Server-side chunked NDJSON with live telemetry delivery",
  ],
};

export default function ApiDocsPage() {
  const [testDomain, setTestDomain] = useState("paharadar-demo-before.vercel.app");
  const [loading, setLoading] = useState(false);
  const [packets, setPackets] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [copiedCurl, setCopiedCurl] = useState(false);

  const curlCommand = `curl -X POST http://localhost:3000/api/scan \\
  -H "Content-Type: application/json" \\
  -d '{"url":"${testDomain}","consent":true}'`;

  const runTest = async () => {
    setLoading(true);
    setPackets([]);
    setError("");

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: testDomain, consent: true }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Request rejected" }));
        setError(err.error || `HTTP ${res.status}`);
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop()!;
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            setPackets((prev) => [...prev, data]);
          } catch {
            // ignore non-json
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand).then(() => {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    });
  };

  return (
    <div className="pb-24 pt-6">
      <PageHeader
        eyebrow="Developer Reference"
        title={<>Interactive API Console &amp; <span className="text-gradient">Specifications</span></>}
      >
        Inspect the internal streaming endpoint used by Paharadar. Built with SSRF safeguards, Node.js raw networking, and NDJSON live stream delivery.
      </PageHeader>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Specs Column */}
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                {ENDPOINT.method}
              </span>
              <span className="text-sm font-bold text-white font-mono">{ENDPOINT.path}</span>
            </div>
            <p className="mt-3 text-sm text-mute leading-relaxed">{ENDPOINT.desc}</p>

            {/* Request Schema */}
            <div className="mt-5 border-t border-white/[0.08] pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-2">
                Request Payload (JSON)
              </span>
              <div className="rounded-2xl border border-white/[0.08] bg-black/80 p-4 font-mono text-xs text-emerald-300">
                <pre>{JSON.stringify({ url: "example.com.bd", consent: true }, null, 2)}</pre>
              </div>
            </div>

            {/* Streaming explanation */}
            <div className="mt-5 border-t border-white/[0.08] pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-2">
                Streaming Protocol (NDJSON)
              </span>
              <p className="text-xs text-mute leading-relaxed mb-2">
                Streams line-by-line JSON events as individual security checks complete:
              </p>
              <div className="rounded-2xl border border-white/[0.08] bg-black/80 p-3.5 font-mono text-[11px] text-mute space-y-1">
                <div><code className="text-emerald-400">&#123;&quot;type&quot;: &quot;finding&quot;, &quot;finding&quot;: &#123; &quot;id&quot;: &quot;tls&quot;, &quot;severity&quot;: &quot;pass&quot; ... &#125;&#125;</code></div>
                <div><code className="text-cyan-400">&#123;&quot;type&quot;: &quot;done&quot;&#125;</code></div>
              </div>
            </div>

            {/* Safeguards */}
            <div className="mt-5 border-t border-white/[0.08] pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-2">
                Security Controls
              </span>
              <ul className="space-y-2 text-xs text-mute">
                {ENDPOINT.safeguards.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* cURL Snippet */}
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-mute">cURL Example</span>
              <button
                onClick={copyCurl}
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                {copiedCurl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCurl ? "Copied" : "Copy cURL"}</span>
              </button>
            </div>
            <pre className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/80 p-4 font-mono text-xs text-emerald-300 leading-relaxed">
              <code>{curlCommand}</code>
            </pre>
          </div>
        </div>

        {/* Live Test Console */}
        <div>
          <div className="glass-panel sticky top-24 rounded-3xl p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Live API Test Workbench
                </span>
              </div>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                Ready
              </span>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-mute block mb-2">
                Target Domain Parameter
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={testDomain}
                  onChange={(e) => setTestDomain(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-400"
                  placeholder="domain.com"
                />
                <button
                  onClick={runTest}
                  disabled={loading || !testDomain.trim()}
                  className="btn-primary flex items-center gap-1.5 shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-40"
                >
                  <Play className="h-3 w-3" />
                  <span>{loading ? "Streaming…" : "Execute"}</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Packet Stream Viewer */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-mute mb-2">
                <span>Received Event Stream</span>
                <span className="text-emerald-400">{packets.length} Events</span>
              </div>

              <div className="h-[360px] overflow-y-auto rounded-2xl border border-white/[0.08] bg-black/80 p-3 text-xs space-y-2">
                {packets.length === 0 && !loading && (
                  <div className="h-full flex items-center justify-center text-center text-mute text-xs">
                    Click &apos;Execute&apos; to trigger a live streaming test call
                  </div>
                )}

                {packets.map((pkt, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 font-mono text-[11px]"
                  >
                    <div className="flex items-center justify-between text-mute mb-1">
                      <span className="text-emerald-400 font-bold">EVENT #{idx + 1} [{pkt.type}]</span>
                      <span className="text-[10px] text-slate-300">
                        {pkt.finding?.severity ? pkt.finding.severity.toUpperCase() : "OK"}
                      </span>
                    </div>
                    <pre className="text-emerald-300 overflow-x-auto text-[10px]">
                      {JSON.stringify(pkt, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
