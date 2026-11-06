"use client";
import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

const R = 84;
const C = 2 * Math.PI * R;

export function ScoreRing({ value }: { value: number }) {
  const count = useMotionValue(0);
  const shown = useTransform(count, (v) => Math.round(v));
  const offset = useTransform(count, (v) => C * (1 - v / 100));

  useEffect(() => {
    const a = animate(count, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
    return () => a.stop();
  }, [value, count]);

  const color = value >= 80 ? "#00f2b4" : value >= 50 ? "#f59e0b" : "#ff3355";
  const label =
    value >= 80
      ? "STRONG"
      : value >= 50
      ? "MODERATE"
      : value > 0
      ? "VULNERABLE"
      : "AUDITING";

  return (
    <div className="relative mx-auto h-[210px] w-[210px] flex items-center justify-center">
      <svg
        viewBox="0 0 200 200"
        className="-rotate-90 h-full w-full"
        style={{ filter: `drop-shadow(0 0 16px ${color}44)` }}
      >
        {/* Background track circle */}
        <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="8" />

        {/* Animated dynamic score arc */}
        <motion.circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          animate={{ stroke: color }}
          transition={{ duration: 0.4 }}
        />
      </svg>

      {/* Center Label Hub */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-mute">
          SECURITY SCORE
        </span>
        <div className="flex items-baseline gap-1 mt-0.5">
          <motion.span className="text-5xl font-black tracking-tight text-white">
            {shown}
          </motion.span>
          <span className="text-sm font-semibold text-mute">/100</span>
        </div>
        <span
          className="mt-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border"
          style={{
            borderColor: `${color}60`,
            color: color,
            backgroundColor: `${color}15`,
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
