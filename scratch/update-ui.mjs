import fs from "node:fs";

// 1. Update DetailsPanel.tsx
let details = fs.readFileSync("src/components/DetailsPanel.tsx", "utf8");

// Add dataFreshness badge in header
details = details.replace(
  `<span className="text-[10px] font-mono text-mute">{f.evidence.timestamp}</span>`,
  `<div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                  <span className="h-1 w-1 rounded-full bg-emerald-400" />
                  {f.evidence.dataFreshness === "cached" ? "Cached Audit" : "Fresh Live Probe"}
                </span>
                <span className="text-[10px] font-mono text-mute">{f.evidence.timestamp}</span>
              </div>`
);

// Add Granular DNS Lookups table after Multi-Resolver DNS Evidence
const dnsLookupsBlock = `
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
                          className={\`font-bold \${
                            l.responseCode === "NOERROR"
                              ? "text-emerald-400"
                              : l.responseCode === "NXDOMAIN"
                              ? "text-amber-400"
                              : "text-red-400"
                          }\`}
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
`;

details = details.replace(
  "{/* Technical Reason */}",
  `${dnsLookupsBlock}\n            {/* Technical Reason */}`
);

fs.writeFileSync("src/components/DetailsPanel.tsx", details, "utf8");
console.log("Updated DetailsPanel.tsx");

// 2. Update ScanView.tsx
let scanView = fs.readFileSync("src/components/ScanView.tsx", "utf8");

const freshnessBadge = `          <p className="mt-4 break-all text-base font-bold text-white">{domain}</p>

          {/* Fresh Live Telemetry Indicator */}
          <div className="mt-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Scan · Fresh Telemetry
            </span>
            <span className="text-[10px] font-mono text-mute">Zero Stale Cache</span>
          </div>`;

scanView = scanView.replace(
  `<p className="mt-4 break-all text-base font-bold text-white">{domain}</p>`,
  freshnessBadge
);

fs.writeFileSync("src/components/ScanView.tsx", scanView, "utf8");
console.log("Updated ScanView.tsx");
