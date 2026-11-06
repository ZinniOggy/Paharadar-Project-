"use client";
import { motion } from "motion/react";
import type { Mood } from "./moods";

const CYAN = "#00f2b4";
const LIGHT = "#f0fdf4";
const DARK = "#052e26";

export function Doyel({ mood, size = 80 }: { mood: Mood; size?: number }) {
  const fast = mood === "scanning" || mood === "alarmed";
  const flap = {
    animate: { rotate: [10, -32, 10] },
    transition: { duration: fast ? 0.2 : 0.45, repeat: Infinity, ease: "easeInOut" as const },
    style: { originX: 0.9, originY: 0.9 },
  };

  return (
    <svg viewBox="0 0 120 100" width={size} height={(size * 100) / 120} aria-hidden className="overflow-visible">
      {/* Background Wing */}
      <motion.path d="M56 54 Q40 8 6 24 Q30 32 56 54Z" fill={CYAN} opacity={0.4} {...flap} />
      
      {/* Tail feathers */}
      <path d="M34 52 L6 26 L12 20 L42 44Z" fill={CYAN} />
      <path d="M34 52 L2 34 L8 28 L40 46Z" fill={CYAN} opacity={0.7} />

      {/* Main body */}
      <ellipse cx="58" cy="56" rx="28" ry="19" fill={CYAN} />
      <ellipse cx="66" cy="65" rx="18" ry="8" fill={LIGHT} />

      {/* Head */}
      <circle cx="86" cy="42" r="15" fill={CYAN} />
      <path d="M99 40 L115 44 L99 48Z" fill="#fbbf24" />

      {/* Eye */}
      <circle cx="91" cy="38" r="4.2" fill={LIGHT} />
      <motion.circle
        cx="92"
        cy="38"
        fill={DARK}
        animate={{ r: mood === "alarmed" ? 3.2 : 2 }}
        transition={{ duration: 0.2 }}
      />

      {/* Foreground Wing */}
      <motion.g {...flap}>
        <path d="M56 54 Q40 8 6 24 Q30 32 56 54Z" fill={CYAN} />
        <path d="M44 34 Q30 22 16 27 Q32 32 46 42Z" fill={LIGHT} />
      </motion.g>

      {/* Feet */}
      <line x1="56" y1="74" x2="54" y2="82" stroke={CYAN} strokeWidth="3" strokeLinecap="round" />
      <line x1="66" y1="74" x2="66" y2="82" stroke={CYAN} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
