"use client";
import { motion, useAnimationFrame, useMotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Character } from "./Character";
import { useAgent } from "./AgentProvider";

export function FlyingAgent() {
  const { mood, follow, chatOpen } = useAgent();
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const tilt = useMotionValue(0);

  const sim = useRef({
    cx: 0,
    cy: 0,
    ready: false,
    px: 0,
    py: 0,
    face: 1 as 1 | -1,
  });

  const [facing, setFacing] = useState<1 | -1>(1);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sim.current.px = window.innerWidth * 0.75;
      sim.current.py = window.innerHeight * 0.35;
      const onMove = (e: PointerEvent) => {
        sim.current.px = e.clientX;
        sim.current.py = e.clientY;
      };
      window.addEventListener("pointermove", onMove);
      return () => window.removeEventListener("pointermove", onMove);
    }
  }, []);

  useAnimationFrame((_, delta) => {
    if (typeof window === "undefined") return;
    const s = sim.current;
    const dt = Math.min(delta, 40) / 1000;

    // Perch gracefully near the bottom-right or guide box
    let tx: number, ty: number;
    if (!follow || chatOpen) {
      const r = document.getElementById("guide-box")?.getBoundingClientRect();
      tx = r ? r.left + 40 : window.innerWidth - 140;
      ty = r ? r.top - 65 : window.innerHeight - 180;
    } else {
      // Float gently at a pleasant offset from the pointer
      tx = s.px + 70;
      ty = s.py - 40;
    }

    tx = Math.min(Math.max(tx, 60), window.innerWidth - 80);
    ty = Math.min(Math.max(ty, 60), window.innerHeight - 80);

    if (!s.ready) {
      s.cx = tx;
      s.cy = ty;
      s.ready = true;
    }

    // Gentle, calm, stable floating physics (no frantic speed)
    const smoothRate = 1.6;
    const k = 1 - Math.exp(-smoothRate * dt);
    const nx = s.cx + (tx - s.cx) * k;
    const ny = s.cy + (ty - s.cy) * k;
    const vy = dt > 0 ? (ny - s.cy) / dt : 0;
    s.cx = nx;
    s.cy = ny;
    x.set(nx);
    y.set(ny);

    // Natural banking tilt
    const targetTilt = Math.max(-12, Math.min(12, vy / 80));
    tilt.set(tilt.get() + (targetTilt - tilt.get()) * (1 - Math.exp(-5 * dt)));

    const dx = tx - nx;
    if (Math.abs(dx) > 10) {
      const f = dx < 0 ? -1 : 1;
      if (f !== s.face) {
        s.face = f;
        setFacing(f);
      }
    }
  });

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-50 select-none"
      style={{ x, y }}
    >
      <motion.div
        className="relative"
        style={{ rotate: tilt }}
        animate={{ y: [0, -10, 0], scaleX: facing }}
        transition={{
          y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
          scaleX: { duration: 0.3, ease: "easeOut" },
        }}
      >
        <Character mood={mood} />
      </motion.div>
    </motion.div>
  );
}
