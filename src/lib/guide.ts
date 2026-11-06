import type { Finding } from "./types";
import type { Mood } from "@/components/agent/moods";

export type Stage = "home" | "scanning" | "done" | "error";

export interface GuideState {
  stage: Stage;
  domain: string;
  consent: boolean;
  findings: Finding[];
  score: number;
  previous: number | null;
  error: string;
  opened: string | null;
  page: string;
}

export const INITIAL_GUIDE: GuideState = {
  stage: "home",
  domain: "",
  consent: false,
  findings: [],
  score: 0,
  previous: null,
  error: "",
  opened: null,
  page: "/",
};

export interface Choice {
  id: string;
  label: string;
}
export interface Line {
  key: string;
  text: string;
  mood: Mood;
  choices: Choice[];
}

const ORDER = { critical: 0, warn: 1, info: 2, pass: 3 } as const;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const go = (to: string, label: string): Choice => ({ id: `go:${to}`, label });

function pageLine(page: string): Line | null {
  if (page === "/compare")
    return {
      key: "p-compare",
      mood: "curious",
      text: "Benchmark matrix initialized. Execute simultaneous audits to verify posture improvements between pre-hardening and patched baselines.",
      choices: [{ id: "compare-demo", label: "Load Demonstration Targets" }],
    };
  if (page === "/api-docs")
    return {
      key: "p-api-docs",
      mood: "curious",
      text: "Developer Console: Inspect the POST /api/scan endpoint schema, SSRF protection filters, and test live NDJSON streaming events.",
      choices: [go("/scan", "Return to Scanner")],
    };
  if (page === "/history")
    return {
      key: "p-history",
      mood: "happy",
      text: "Local Telemetry Repository. All audit records persist exclusively within client-side storage with zero remote telemetry leakage.",
      choices: [go("/scan", "Execute New Audit")],
    };
  if (page === "/learn")
    return {
      key: "p-learn",
      mood: "curious",
      text: "Defensive Engineering Knowledge Base. Access practical guides for implementing HSTS, CSP allow-lists, and DMARC anti-spoofing.",
      choices: [go("/learn/hsts", "Inspect HSTS Guide"), go("/learn/csp", "Inspect CSP Guide")],
    };
  if (page.startsWith("/learn/"))
    return {
      key: `p-${page}`,
      mood: "happy",
      text: "Remediation guide active. Review official RFC specifications and step-by-step server configurations.",
      choices: [go("/scan", "Audit Live Target"), go("/learn", "Explore More Guides")],
    };
  if (page === "/citizens")
    return {
      key: "p-citizens",
      mood: "curious",
      text: "Citizen Cyber Defense simulator active. Run through typical Bangladesh financial phishing patterns to evaluate detection vigilance.",
      choices: [],
    };
  if (page === "/about")
    return {
      key: "p-about",
      mood: "happy",
      text: "Threat Intelligence Briefing. Review our analysis of regional web exposures, PHP vulnerability vectors, and the 4-week MVP roadmap.",
      choices: [go("/scan", "Launch Security Scanner")],
    };
  return null;
}

export function lineFor(s: GuideState, introSeen: boolean): Line {
  const pl = pageLine(s.page);
  if (pl) return pl;

  const crit = s.findings.filter((f) => f.severity === "critical");
  const warn = s.findings.filter((f) => f.severity === "warn");
  const domain = s.domain.trim();

  if (s.stage === "error") {
    return {
      key: "error",
      mood: "worried",
      text: `Reconnaissance failed: ${s.error} Verify network reachability or select a reference demo target.`,
      choices: [{ id: "new-scan", label: "Audit another domain" }, { id: "fill-before", label: "Load Unpatched Demo" }],
    };
  }

  if (s.stage === "scanning") {
    const last = s.findings[s.findings.length - 1];
    const verdict = !last
      ? ""
      : last.severity === "pass"
      ? "PASSED"
      : last.severity === "critical"
      ? "CRITICAL EXPOSURE"
      : "REMEDIATION ADVISED";

    return {
      key: "scanning",
      mood: crit.length ? "alarmed" : "scanning",
      text: last
        ? `Auditing ${domain}… Completed ${plural(s.findings.length, "check")}. Latest check: ${last.title} [${verdict}].`
        : `Initiating TLS/DNS handshake with ${domain}. Analyzing broadcasted telemetry...`,
      choices: [],
    };
  }

  if (s.stage === "done") {
    if (s.opened) {
      return {
        key: `open-${s.opened}`,
        mood: "curious",
        text: `Inspecting vector: ${s.opened}. Review technical impact and copy the remediation configuration for your web server.`,
        choices: [],
      };
    }
    const first = [...s.findings].sort((a, b) => ORDER[a.severity] - ORDER[b.severity])[0];
    const trend =
      s.previous === null
        ? ""
        : s.score > s.previous
        ? ` Posture improved (+${s.score - s.previous} pts) since previous assessment.`
        : s.score < s.previous
        ? ` Posture degraded (-${s.previous - s.score} pts) since previous assessment.`
        : " Posture identical to previous scan.";

    if (crit.length) {
      return {
        key: `done-${s.score}-${crit.length}`,
        mood: "alarmed",
        text: `Audit finished. Target ${domain} evaluated at ${s.score}/100 with ${plural(crit.length, "critical exposure")}.${trend}`,
        choices: [
          { id: "open-first", label: `Inspect High-Priority: ${first.title}` },
          { id: "explain-score", label: "Scoring Methodology" },
          { id: "new-scan", label: "Audit Another Target" },
        ],
      };
    }
    if (warn.length) {
      return {
        key: `done-${s.score}-w`,
        mood: "worried",
        text: `Audit completed. ${domain} scored ${s.score}/100. Discovered ${plural(warn.length, "configuration warning")} requiring remediation.${trend}`,
        choices: [
          { id: "open-first", label: `Inspect: ${first.title}` },
          { id: "explain-score", label: "Scoring Methodology" },
          { id: "new-scan", label: "Audit Another Target" },
        ],
      };
    }
    return {
      key: `done-${s.score}-p`,
      mood: "happy",
      text: `Audit completed. ${domain} scored a hardened posture of ${s.score}/100. All baseline defensive response headers and cryptographic certificates verified.${trend}`,
      choices: [
        { id: "new-scan", label: "Audit Another Target" },
        { id: "compare-demo", label: "Run Comparative Matrix" },
      ],
    };
  }

  if (domain && !s.consent) {
    return {
      key: "need-consent",
      mood: "curious",
      text: `Target specified (${domain}). Confirm testing authorization before executing reconnaissance.`,
      choices: [{ id: "scan", label: "Authorize and Execute" }],
    };
  }

  if (introSeen) {
    return {
      key: "ready",
      mood: "idle",
      text: "Sentinel active on standby. Supply a target domain or select a test bed below.",
      choices: [
        { id: "fill-before", label: "Unpatched Reference Target" },
        { id: "fill-after", label: "Hardened Reference Target" },
      ],
    };
  }

  return {
    key: "welcome",
    mood: "idle",
    text: "Paharadar Sentinel v2.0 initialized. Ready to perform passive web security audits and automated configuration generation.",
    choices: [
      { id: "explain-what", label: "Scope of Passive Auditing" },
      { id: "fill-before", label: "Demonstration Audit (PHP 7.4)" },
    ],
  };
}

export function answerFor(id: string, s: GuideState): Line | null {
  if (id === "explain-what")
    return {
      key: "a-what",
      mood: "curious",
      text: "Passive reconnaissance audits only publicly visible telemetry: HTTP response headers, SSL/TLS handshake certificates, and DNS records. Zero intrusive payload injection.",
      choices: [{ id: "fill-before", label: "Load Unpatched Demo" }, { id: "new-scan", label: "Audit Custom Target" }],
    };
  if (id === "explain-score")
    return {
      key: "a-score",
      mood: "curious",
      text: "Scoring starts at 100. Each Critical vulnerability deducts 20 points, Warnings deduct 8 points, and informational notices deduct 2 points. Target is evaluated from 0 to 100.",
      choices: [{ id: "open-first", label: "Inspect Highest Severity Vector" }],
    };
  return null;
}
