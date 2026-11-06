"use client";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useScan } from "@/hooks/useScan";
import { score } from "@/lib/score";
import { SEV } from "@/lib/severity";
import { CATS, CAT_ORDER } from "@/lib/categories";
import { DEMO } from "@/lib/site";
import { PageHeader } from "./PageHeader";
import type { Finding } from "@/lib/types";
import { ArrowRight, CheckCircle2, AlertTriangle, Scale, RefreshCw } from "lucide-react";

function Cell({ f, busy }: { f?: Finding; busy: boolean }) {
  if (!f) return <span className="text-xs text-mute">{busy ? "Checking…" : "–"}</span>;
  return (
    <div>
      <span
        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${SEV[f.severity].badge}`}
      >
        {SEV[f.severity].label}
      </span>
      <p className="mt-1 hidden text-xs text-mute sm:block leading-snug">{f.found}</p>
    </div>
  );
}

function Side({ name, s, busy, label }: { name: string; s: number; busy: boolean; label: string }) {
  const color = s >= 80 ? "text-emerald-400" : s >= 50 ? "text-amber-400" : "text-red-400";
  return (
    <div className="glass-panel rounded-3xl p-6">
      <div className="flex items-center justify-between text-xs font-semibold text-mute uppercase tracking-wider">
        <span>{label}</span>
        <span className="truncate max-w-[180px] text-white">{name || "Awaiting target"}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={`text-5xl font-black ${color}`}>{busy ? "…" : s}</span>
        <span className="text-sm font-semibold text-mute">/100</span>
      </div>
      <div className="mt-2 text-xs text-mute">
        {busy ? "Active audit stream..." : s >= 80 ? "Hardened Security Posture" : "Remediation Recommended"}
      </div>
    </div>
  );
}

export function CompareView() {
  const A = useScan();
  const B = useScan();
  const [da, setDa] = useState("");
  const [db, setDb] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const f = () => {
      setDa(DEMO.before);
      setDb(DEMO.after);
      setOk(true);
    };
    window.addEventListener("paharadar:compare-demo", f);
    return () => window.removeEventListener("paharadar:compare-demo", f);
  }, []);

  const busy = A.status === "scanning" || B.status === "scanning";
  const ready = ok && !!da.trim() && !!db.trim() && !busy;
  const started = A.status !== "idle" || B.status !== "idle";
  const run = () => {
    if (ready) {
      A.run(da, true);
      B.run(db, true);
    }
  };

  const ma = new Map(A.findings.map((f) => [f.id, f]));
  const mb = new Map(B.findings.map((f) => [f.id, f]));
  const rows = [...new Set([...A.findings, ...B.findings].map((f) => f.id))]
    .map((id) => (ma.get(id) ?? mb.get(id)) as Finding)
    .sort((x, y) => CAT_ORDER.indexOf(x.category) - CAT_ORDER.indexOf(y.category));

  const sa = score(A.findings);
  const sb = score(B.findings);
  const both = A.status === "done" && B.status === "done";
  const diffs = rows.filter(
    (r) => ma.get(r.id) && mb.get(r.id) && ma.get(r.id)!.severity !== mb.get(r.id)!.severity
  ).length;

  return (
    <div className="pb-24 pt-6">
      <PageHeader
        eyebrow="Comparative Hardening Matrix"
        title={<>Compare two sites <span className="text-gradient">side by side.</span></>}
      >
        See exactly which security checks improved after applying fixes, or benchmark two different environments you manage.
      </PageHeader>

      {/* Target input form */}
      <form
        className="glass-panel mt-8 grid gap-4 rounded-3xl p-6 sm:p-7 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <div>
          <label htmlFor="input-a" className="block text-xs font-semibold uppercase tracking-wider text-mute mb-2">
            Website A (Before Hardening)
          </label>
          <input
            id="input-a"
            value={da}
            onChange={(e) => setDa(e.target.value)}
            placeholder="before.example.com"
            className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
          />
        </div>

        <div>
          <label htmlFor="input-b" className="block text-xs font-semibold uppercase tracking-wider text-mute mb-2">
            Website B (After Hardening)
          </label>
          <input
            id="input-b"
            value={db}
            onChange={(e) => setDb(e.target.value)}
            placeholder="after.example.com"
            className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
          />
        </div>

        <label className="flex items-start gap-3 text-xs text-mute md:col-span-2 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={ok}
            onChange={(e) => setOk(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded accent-emerald-400"
          />
          <span>I confirm I own both websites or hold authorization to test them.</span>
        </label>

        <div className="flex flex-wrap gap-3 md:col-span-2 pt-2">
          <button
            type="submit"
            disabled={!ready}
            className="btn-primary rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-40"
          >
            {busy ? "Comparing…" : "Compare Both Sites"}
          </button>

          <button
            type="button"
            onClick={() => {
              setDa(DEMO.before);
              setDb(DEMO.after);
              setOk(true);
            }}
            className="btn-secondary rounded-full px-5 py-2.5 text-xs font-semibold"
          >
            Load Demo Sites
          </button>
        </div>
      </form>

      {(A.error || B.error) && (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
          {A.error || B.error}
        </div>
      )}

      {started && (
        <div className="mt-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Side label="SITE A" name={A.domain} s={sa} busy={A.status === "scanning"} />
            <Side label="SITE B" name={B.domain} s={sb} busy={B.status === "scanning"} />
          </div>

          {both && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-3xl p-5 text-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-slate-200">
                <Scale className="h-4 w-4 text-emerald-400" />
                <span>
                  {sb === sa
                    ? "Both websites scored identical security ratings."
                    : `Site B scored ${Math.abs(sb - sa)} points ${sb > sa ? "higher" : "lower"} than Site A.`}
                </span>
              </div>
              <span className="text-emerald-400 font-bold">{diffs} Differences Found</span>
            </motion.div>
          )}

          {/* Matrix Table */}
          {rows.length > 0 && (
            <div className="glass-panel rounded-3xl overflow-hidden">
              <div className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-white/[0.08] px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-mute bg-white/[0.02]">
                <span>Check</span>
                <span>Site A</span>
                <span>Site B</span>
              </div>

              <div className="divide-y divide-white/[0.06]">
                {rows.map((r) => {
                  const fa = ma.get(r.id);
                  const fb = mb.get(r.id);
                  const improved = fa && fb && fa.severity !== fb.severity && fb.severity === "pass";

                  return (
                    <div
                      key={r.id}
                      className={`grid grid-cols-[1.2fr_1fr_1fr] items-start gap-4 p-5 text-xs transition-colors ${
                        improved ? "bg-emerald-500/[0.04]" : ""
                      }`}
                    >
                      <div>
                        <span className="font-bold text-white text-sm">{r.title}</span>
                        <span className="block text-[10px] text-mute uppercase mt-0.5">
                          {r.category}
                        </span>
                      </div>
                      <Cell f={fa} busy={A.status === "scanning"} />
                      <Cell f={fb} busy={B.status === "scanning"} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
