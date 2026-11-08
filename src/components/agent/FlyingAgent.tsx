"use client";
import { motion, useAnimationFrame, useMotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Character } from "./Character";
import { useAgent } from "./AgentProvider";
import { SPEEDS, SPEED_CONFIG } from "./agent.config";

export function FlyingAgent() {
  const { mood, follow, chatOpen, speed, bumpReact, reactKey } = useAgent();
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const tilt = useMotionValue(0);

  const sim = useRef({
    cx: 0,
    cy: 0,
    ready: false,
    px: 0,
    py: 0,
    vx: 0,
    vy: 0,
    face: 1 as 1 | -1,
  });

  const [facing, setFacing] = useState<1 | -1>(1);

  // Initialize mouse pointer coordinates and tracking
  useEffect(() => {
    if (typeof window !== "undefined") {
      sim.current.px = window.innerWidth * 0.7;
      sim.current.py = window.innerHeight * 0.4;

      const onMove = (e: PointerEvent | MouseEvent) => {
        sim.current.px = e.clientX;
        sim.current.py = e.clientY;
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("mousemove", onMove, { passive: true });

      return () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("mousemove", onMove);
      };
    }
  }, []);

  // Instant response when speed or follow toggle changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = sim.current;
    if (s.ready) {
      const tx = follow ? s.px + 32 : window.innerWidth - 130;
      const ty = follow ? s.py - 50 : window.innerHeight - 150;
      // Instantly accelerate with impulse proportional to speed setting
      const boost = speed === "zippy" ? 0.9 : speed === "normal" ? 0.45 : 0.2;
      s.cx += (tx - s.cx) * boost;
      s.cy += (ty - s.cy) * boost;
      x.set(s.cx);
      y.set(s.cy);
    }
  }, [speed, follow, x, y]);

  useAnimationFrame((time, delta) => {
    if (typeof window === "undefined") return;
    const s = sim.current;
    const dt = Math.min(delta, 32) / 1000;

    let tx: number;
    let ty: number;

    // Follow cursor if enabled; otherwise perch neatly above guide box with clearance
    if (follow) {
      // Offset comfortably to the top-right of the pointer
      tx = s.px + 32;
      ty = s.py - 50;
    } else {
      const guideBox = document.getElementById("guide-box")?.getBoundingClientRect();
      if (guideBox && chatOpen) {
        // Sit well ABOVE the box with generous clearance so it NEVER overlaps the header or text
        tx = guideBox.right - 110;
        ty = guideBox.top - 125;
      } else {
        tx = window.innerWidth - 130;
        ty = window.innerHeight - 150;
      }
    }

    // Keep comfortably within screen viewport bounds
    tx = Math.min(Math.max(tx, 35), window.innerWidth - 115);
    ty = Math.min(Math.max(ty, 35), window.innerHeight - 115);

    if (!s.ready) {
      s.cx = tx;
      s.cy = ty;
      s.ready = true;
    }

    // Responsive physics speed based on user settings
    const rate = SPEEDS[speed] ?? 12.0;
    const k = 1 - Math.exp(-rate * dt);

    const prevX = s.cx;
    const prevY = s.cy;
    s.cx += (tx - s.cx) * k;
    s.cy += (ty - s.cy) * k;

    s.vx = dt > 0 ? (s.cx - prevX) / dt : 0;
    s.vy = dt > 0 ? (s.cy - prevY) / dt : 0;

    x.set(s.cx);
    y.set(s.cy);

    // Natural banking tilt towards motion direction
    const targetTilt = Math.max(-18, Math.min(18, s.vx / 32));
    const currentTilt = tilt.get();
    tilt.set(currentTilt + (targetTilt - currentTilt) * (1 - Math.exp(-12 * dt)));

    // Face direction of cursor motion
    const dx = s.px - s.cx;
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
      className="fixed left-0 top-0 z-50 pointer-events-auto cursor-pointer select-none"
      style={{ x, y }}
      onClick={() => bumpReact()}
      title="Click to interact with Pahara"
    >
      <motion.div
        className="relative"
        style={{ rotate: tilt }}
        animate={{
          y: [0, -8, 0],
          scaleX: facing,
        }}
        transition={{
          y: { duration: SPEED_CONFIG[speed]?.bobDuration ?? 2.0, repeat: Infinity, ease: "easeInOut" },
          scaleX: { duration: 0.2, ease: "easeOut" },
        }}
      >
        <Character mood={mood} reactKey={reactKey} />
      </motion.div>
    </motion.div>
  );
}
