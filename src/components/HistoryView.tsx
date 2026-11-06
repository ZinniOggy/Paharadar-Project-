"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { clearHistory, deleteEntry, loadHistory, type Entry } from "@/lib/history";
import { download, historyCsv } from "@/lib/export";
import { PageHeader } from "./PageHeader";
import { Trash2, Download, ArrowRight, Calendar, ShieldCheck, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useScanCtx } from "./ScanProvider";

const fmt = (t: number) =>
  new Date(t).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function Trend({ list }: { list: Entry[] }) {
  const pts = [...list].reverse().slice(-12);
  if (pts.length < 2)
    return (
      <div className="py-12 text-center text-xs text-mute">
        Run multiple audits on this domain to generate a longitudinal trendline.
      </div>
    );

  const W = 600,
    H = 180,
    P = 28;
  const xy = pts.map((e, i) => ({
    x: P + (i / (pts.length - 1)) * (W - 2 * P),
    y: H - P - (e.score / 100) * (H - 2 * P),
    s: e.score,
  }));
  const d = xy.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Score trend over time">
      {[0, 50, 100].map((v) => {
        const y = H - P - (v / 100) * (H - 2 * P);
        return (
          <g key={v}>
            <line x1={P} x2={W - P} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <text x={4} y={y + 3} fontSize="9" fill="#8e9bb0" fontFamily="sans-serif">
              {v}
            </text>
          </g>
        );
      })}
      <motion.path
        d={d}
        fill="none"
        stroke="#00f2b4"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 10px rgba(0,242,180,0.5))" }}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      {xy.map((p, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 + i * 0.05 }}
        >
          <circle cx={p.x} cy={p.y} r="5" fill="#000000" stroke="#00f2b4" strokeWidth="2.5" />
          <text
            x={p.x}
            y={p.y - 10}
            fontSize="10"
            fontFamily="sans-serif"
            fontWeight="bold"
            textAnchor="middle"
            fill="#ffffff"
          >
            {p.s}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}

export function HistoryView() {
  const [list, setList] = useState<Entry[] | null>(null);
  const [domain, setDomain] = useState("");
  const { setInput, setConsent } = useScanCtx();
  const router = useRouter();

  useEffect(() => {
    setList(loadHistory());
  }, []);

  useEffect(() => {
    if (list && list.length && !list.some((e) => e.domain === domain)) setDomain(list[0].domain);
  }, [list, domain]);

  const rescan = (d: string) => {
    setInput(d);
    setConsent(true);
    router.push("/scan");
  };

  if (list === null) return <div className="py-24 text-xs text-mute text-center">Loading audit cache…</div>;

  if (!list.length) {
    return (
      <div className="pb-24 pt-6">
        <PageHeader eyebrow="Security Dashboard" title="No Previous Audits Recorded">
          Your scans are saved exclusively in this browser. Run your first website audit to begin tracking security posture history.
        </PageHeader>
        <Link
          href="/scan"
          className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-wider"
        >
          <span>Run First Audit</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const domains = [...new Set(list.map((e) => e.domain))];
  const avg = Math.round(list.reduce((n, e) => n + e.score, 0) / list.length);
  const best = Math.max(...list.map((e) => e.score));

  const wipe = () => {
    if (window.confirm("Delete all saved scan records from this browser?")) {
      clearHistory();
      setList([]);
    }
  };

  return (
    <div className="pb-24 pt-6">
      <PageHeader
        eyebrow="Security Dashboard"
        title={<>Your audit history, <span className="text-gradient">over time.</span></>}
      >
        Track progress as you deploy patches. All records are stored locally on your device; no server logs are kept.
      </PageHeader>

      {/* KPI Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total Scans Conducted", list.length],
          ["Websites Monitored", domains.length],
          ["Average Score", `${avg}/100`],
          ["Best Score Achieved", `${best}/100`],
        ].map(([label, val], idx) => (
          <div key={idx} className="glass-panel rounded-3xl p-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-mute">{label}</span>
            <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-white">{val}</p>
          </div>
        ))}
      </div>

      {/* Trendline Chart */}
      <div className="glass-panel mt-6 rounded-3xl p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
          <div>
            <h3 className="text-base font-bold text-white">Security Score Timeline</h3>
            <p className="text-xs text-mute mt-0.5">Historical posture progression for selected target</p>
          </div>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-400"
          >
            {domains.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-6">
          <Trend key={domain} list={list.filter((e) => e.domain === domain)} />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel mt-6 rounded-3xl p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
          <h3 className="text-base font-bold text-white">All Logged Audits</h3>
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => download("paharadar-history.csv", historyCsv(list), "text/csv")}
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
            <span className="text-white/20">|</span>
            <button onClick={wipe} className="flex items-center gap-1.5 text-red-400 hover:text-red-300 font-medium">
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          </div>
        </div>

        <div className="mt-4 divide-y divide-white/[0.06]">
          {list.map((e) => {
            const color = e.score >= 80 ? "text-emerald-400" : e.score >= 50 ? "text-amber-400" : "text-red-400";
            return (
              <div key={e.at} className="flex items-center justify-between py-4 text-xs">
                <div>
                  <span className="font-bold text-white text-sm">{e.domain}</span>
                  <div className="flex items-center gap-3 text-mute text-xs mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {fmt(e.at)}
                    </span>
                    <span>·</span>
                    <span>
                      <strong className="text-red-400">{e.counts.critical}</strong> Critical /{" "}
                      <strong className="text-amber-400">{e.counts.warn}</strong> Warnings
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={`text-xl font-black ${color}`}>{e.score}</span>
                    <span className="text-mute text-xs">/100</span>
                  </div>
                  <button
                    onClick={() => rescan(e.domain)}
                    className="btn-secondary rounded-xl p-2 text-mute hover:text-white"
                    title="Re-scan domain"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
