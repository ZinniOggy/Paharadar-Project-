"use client";
import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAgent } from "./agent/AgentProvider";
import { useScanCtx } from "./ScanProvider";
import { score } from "@/lib/score";
import { DEMO } from "@/lib/site";

const ORDER = { critical: 0, warn: 1, info: 2, inconclusive: 3, pass: 4 } as const;

export function GuideBridge() {
  const router = useRouter();
  const path = usePathname();
  const { setGuide, actions } = useAgent();
  const sc = useScanCtx();
  const s = score(sc.findings);
  const first = useMemo(
    () => [...sc.findings].sort((a, b) => ORDER[a.severity] - ORDER[b.severity])[0],
    [sc.findings]
  );

  // what the guide’s choice buttons do (re-assigned every render so it always sees fresh state)
  useEffect(() => {
    actions.current.run = (id) => {
      if (id.startsWith("go:")) router.push(id.slice(3));
      else if (id === "fill-before" || id === "fill-after") {
        sc.setInput(id === "fill-before" ? DEMO.before : DEMO.after);
        if (path !== "/scan") router.push("/scan");
      } else if (id === "scroll-how") {
        if (path !== "/") router.push("/#how");
        else document.getElementById("how")?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (id === "scan") { if (sc.start()) router.push("/scan"); }
      else if (id === "open-first") { if (first) sc.setOpen(first); }
      else if (id === "new-scan") { sc.reset(); sc.setOpen(null); router.push("/scan"); }
      else if (id === "compare-demo") window.dispatchEvent(new Event("paharadar:compare-demo"));
    };
  });

  // tell the guide what is happening
  useEffect(() => {
    setGuide({
      stage: sc.status === "idle" ? "home" : sc.status,
      domain: sc.status === "idle" ? sc.input : sc.domain,
      consent: sc.consent, findings: sc.findings, score: s,
      previous: sc.previous, error: sc.error, opened: sc.open?.title ?? null, page: path,
    });
  }, [sc.status, sc.input, sc.domain, sc.consent, sc.findings, s, sc.previous, sc.error, sc.open, path, setGuide]);

  return null;
}