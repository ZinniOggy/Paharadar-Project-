"use client";
import { useEffect, useRef } from "react";
import { Alignment, Fit, Layout, useRive } from "@rive-app/react-canvas";
import type { Rive } from "@rive-app/react-canvas";

const layout = new Layout({ fit: Fit.Cover, alignment: Alignment.Center });
const pick = (names: string[], re: RegExp) => names.find((n) => re.test(n));

export function ScanPortal({
  phase, tick, className = "",
}: { phase: "scanning" | "done"; tick: number; className?: string }) {
  const riveRef = useRef<Rive | null>(null);

  const { rive, RiveComponent } = useRive({
    src: "/rive/portal-suspense.riv",
    autoplay: false,
    layout,
    // when "Enter" finishes, settle into the idle loop
    onStop: (e) => {
      const r = riveRef.current;
      const names = Array.isArray(e.data) ? (e.data as string[]) : [];
      if (r && names.some((n) => /enter/i.test(n))) {
        const idle = pick(r.animationNames, /ear\s*tickle/i);
        if (idle) r.play(idle);
      }
    },
  });

  useEffect(() => { riveRef.current = rive; }, [rive]);

  useEffect(() => {
    if (rive) console.log("[rive portal] animations:", rive.animationNames, "state machines:", rive.stateMachineNames);
  }, [rive]);

  // scan starts → Enter. scan done → TakeOff
  useEffect(() => {
    if (!rive) return;
    const names = rive.animationNames;
    if (phase === "scanning") {
      rive.stop();
      const start = pick(names, /enter/i) ?? pick(names, /ear\s*tickle/i) ?? names[0];
      if (start) rive.play(start);
    } else {
      const off = pick(names, /take\s*off/i);
      if (off) { rive.stop(); rive.play(off); }
    }
  }, [rive, phase]);

  // one hop per finished check
  useEffect(() => {
    if (!rive || phase !== "scanning" || tick === 0) return;
    const hop = pick(rive.animationNames, /hop/i);
    if (hop) rive.play(hop);
  }, [rive, tick, phase]);

  return (
    <div className={`overflow-hidden ${className}`} style={{ mixBlendMode: "screen" }} aria-hidden>
      <RiveComponent />
    </div>
  );
}