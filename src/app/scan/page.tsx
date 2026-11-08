"use client";
import { useScanCtx } from "@/components/ScanProvider";
import { ScanView } from "@/components/ScanView";
import { Hero } from "@/components/Hero";
import { score } from "@/lib/score";

export default function Page() {
  const { domain, findings, status, previous, reset } = useScanCtx();

  if (!domain) {
    return (
      <div className="py-4">
        <Hero />
      </div>
    );
  }

  return (
    <ScanView
      domain={domain}
      findings={findings}
      status={status}
      score={score(findings)}
      previous={previous}
      reset={reset}
    />
  );
}
