"use client";
import { motion } from "motion/react";
import type { Mood } from "./moods";

interface Props {
  mood: Mood;
  size?: number;
  firing?: boolean;
}

export function MechaSentinel({ mood, size = 110, firing = false }: Props) {
  const isAlarmed = mood === "alarmed" || mood === "worried";
  const isScanning = mood === "scanning";

  // Palette based on mood
  const glowColor = isAlarmed ? "#ef4444" : isScanning ? "#06b6d4" : "#10b981";
  const coreColor = isAlarmed ? "#f87171" : isScanning ? "#22d3ee" : "#34d399";
  const visorColor = isAlarmed ? "#ef4444" : isScanning ? "#38bdf8" : "#00f2b4";

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* Outer ambient energy field */}
      <motion.div
        className="absolute inset-0 rounded-full blur-xl pointer-events-none"
        style={{ background: glowColor }}
        animate={{
          opacity: isAlarmed ? [0.4, 0.8, 0.4] : isScanning ? [0.3, 0.6, 0.3] : [0.2, 0.45, 0.2],
          scale: isAlarmed ? [1, 1.25, 1] : [1, 1.1, 1],
        }}
        transition={{ duration: isAlarmed ? 0.6 : 1.8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orbiting Satellite Bit Shield 1 */}
      <motion.div
        className="absolute h-3 w-1.5 rounded-sm pointer-events-none"
        style={{
          backgroundColor: glowColor,
          boxShadow: `0 0 10px ${glowColor}`,
        }}
        animate={{
          x: [-size * 0.48, -size * 0.42, -size * 0.48],
          y: [-12, -4, -12],
          rotate: [-15, 15, -15],
        }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orbiting Satellite Bit Shield 2 */}
      <motion.div
        className="absolute h-3 w-1.5 rounded-sm pointer-events-none"
        style={{
          backgroundColor: glowColor,
          boxShadow: `0 0 10px ${glowColor}`,
        }}
        animate={{
          x: [size * 0.48, size * 0.42, size * 0.48],
          y: [-8, 2, -8],
          rotate: [15, -15, 15],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      />

      {/* Main Fighter Robot Body */}
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Armor Gradients */}
          <linearGradient id="armorPlate" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          <linearGradient id="armorHighlight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="visorGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={visorColor} stopOpacity="0.4" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor={visorColor} stopOpacity="0.4" />
          </linearGradient>

          <radialGradient id="plasmaCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor={coreColor} />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0.1" />
          </radialGradient>

          <filter id="fighterGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Thruster Plasma Flames */}
        <g id="thrusters">
          {/* Left Thruster Jet */}
          <motion.path
            d="M 44 94 Q 40 108 44 118 Q 48 108 46 94 Z"
            fill={glowColor}
            filter="url(#fighterGlow)"
            animate={{
              d: [
                "M 44 94 Q 40 108 44 118 Q 48 108 46 94 Z",
                "M 44 94 Q 38 114 44 124 Q 50 114 46 94 Z",
                "M 44 94 Q 40 108 44 118 Q 48 108 46 94 Z",
              ],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{ duration: 0.25, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Right Thruster Jet */}
          <motion.path
            d="M 74 94 Q 72 108 76 118 Q 80 108 76 94 Z"
            fill={glowColor}
            filter="url(#fighterGlow)"
            animate={{
              d: [
                "M 74 94 Q 72 108 76 118 Q 80 108 76 94 Z",
                "M 74 94 Q 70 114 76 124 Q 82 114 76 94 Z",
                "M 74 94 Q 72 108 76 118 Q 80 108 76 94 Z",
              ],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{ duration: 0.28, repeat: Infinity, ease: "easeInOut" }}
          />
        </g>

        {/* Tactical Shoulders & Pauldrons */}
        <g id="pauldrons">
          {/* Left Pauldron */}
          <path
            d="M 28 48 L 44 44 L 46 64 L 26 62 Z"
            fill="url(#armorPlate)"
            stroke={glowColor}
            strokeWidth="1.2"
            strokeOpacity="0.7"
          />
          <line x1="30" y1="52" x2="42" y2="48" stroke={glowColor} strokeWidth="1" strokeOpacity="0.4" />

          {/* Right Pauldron */}
          <path
            d="M 92 48 L 76 44 L 74 64 L 94 62 Z"
            fill="url(#armorPlate)"
            stroke={glowColor}
            strokeWidth="1.2"
            strokeOpacity="0.7"
          />
          <line x1="90" y1="52" x2="78" y2="48" stroke={glowColor} strokeWidth="1" strokeOpacity="0.4" />

          {/* Arm Pods / Blaster Mounts */}
          <rect x="22" y="56" width="6" height="18" rx="2" fill="#0f172a" stroke={glowColor} strokeWidth="1" />
          <rect x="92" y="56" width="6" height="18" rx="2" fill="#0f172a" stroke={glowColor} strokeWidth="1" />
          {/* Barrel emitters */}
          <circle cx="25" cy="74" r="1.5" fill={glowColor} />
          <circle cx="95" cy="74" r="1.5" fill={glowColor} />
        </g>

        {/* Torso Exoskeleton */}
        <g id="torso">
          {/* Main Chest Chassis */}
          <polygon
            points="42,42 78,42 86,72 60,94 34,72"
            fill="url(#armorPlate)"
            stroke="#334155"
            strokeWidth="1.5"
          />
          {/* Chest Inset Armor Plates */}
          <polygon
            points="46,46 74,46 80,68 60,86 40,68"
            fill="url(#armorHighlight)"
            stroke={glowColor}
            strokeWidth="0.8"
            strokeOpacity="0.5"
          />

          {/* Arc Reactor Core */}
          <circle cx="60" cy="62" r="11" fill="#020617" stroke={glowColor} strokeWidth="1.5" />
          <circle cx="60" cy="62" r="8" fill="url(#plasmaCore)" filter="url(#fighterGlow)" />
          {/* Reactor ring struts */}
          <line x1="60" y1="51" x2="60" y2="55" stroke={glowColor} strokeWidth="1.5" />
          <line x1="60" y1="69" x2="60" y2="73" stroke={glowColor} strokeWidth="1.5" />
          <line x1="49" y1="62" x2="53" y2="62" stroke={glowColor} strokeWidth="1.5" />
          <line x1="67" y1="62" x2="71" y2="62" stroke={glowColor} strokeWidth="1.5" />

          {/* Tech Seams & Vent Details */}
          <line x1="46" y1="78" x2="54" y2="82" stroke="#475569" strokeWidth="1" />
          <line x1="74" y1="78" x2="66" y2="82" stroke="#475569" strokeWidth="1" />
        </g>

        {/* Combat Helmet / Head */}
        <g id="helmet">
          {/* Crest / Antennas */}
          <polygon points="56,12 64,12 62,22 58,22" fill={glowColor} />
          <line x1="42" y1="18" x2="48" y2="28" stroke={glowColor} strokeWidth="1.5" />
          <line x1="78" y1="18" x2="72" y2="28" stroke={glowColor} strokeWidth="1.5" />

          {/* Head Shell */}
          <polygon
            points="42,26 78,26 84,42 60,48 36,42"
            fill="url(#armorPlate)"
            stroke={glowColor}
            strokeWidth="1.4"
          />

          {/* Tactical HUD Visor */}
          <polygon
            points="45,32 75,32 79,39 60,42 41,39"
            fill="url(#visorGrad)"
            filter="url(#fighterGlow)"
          />

          {/* Visor Scan Line */}
          {isScanning && (
            <motion.line
              x1="45"
              y1="36"
              x2="75"
              y2="36"
              stroke="#ffffff"
              strokeWidth="1.5"
              animate={{ x1: [45, 65, 45], x2: [55, 75, 55] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* Alarmed Crosshair */}
          {isAlarmed && (
            <g stroke="#ffffff" strokeWidth="1">
              <circle cx="60" cy="36" r="3" fill="none" />
              <line x1="55" y1="36" x2="65" y2="36" />
              <line x1="60" y1="32" x2="60" y2="40" />
            </g>
          )}

          {/* Chin Guard */}
          <polygon points="52,44 68,44 64,48 56,48" fill="#0f172a" stroke="#334155" strokeWidth="1" />
        </g>

        {/* Firing Beam Effect (when triggered) */}
        {firing && (
          <motion.line
            x1="95"
            y1="74"
            x2="150"
            y2="74"
            stroke={glowColor}
            strokeWidth="3"
            filter="url(#fighterGlow)"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1, opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </svg>
    </div>
  );
}
