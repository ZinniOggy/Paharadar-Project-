"use client";
import { motion } from "motion/react";
import type { Mood } from "./moods";

interface Props {
  mood: Mood;
  size?: number;
  firing?: boolean;
}

export function CyberSoldier({ mood, size = 115, firing = false }: Props) {
  const isAlarmed = mood === "alarmed" || mood === "worried";
  const isScanning = mood === "scanning";

  // Palette based on mood
  const laserColor = isAlarmed ? "#ef4444" : isScanning ? "#06b6d4" : "#10b981";
  const visorColor = isAlarmed ? "#ff3333" : isScanning ? "#38bdf8" : "#00f2b4";
  const auraColor = isAlarmed ? "rgba(239, 68, 68, 0.4)" : isScanning ? "rgba(6, 182, 212, 0.3)" : "rgba(16, 185, 129, 0.3)";

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* Dynamic aura */}
      <motion.div
        className="absolute inset-0 rounded-full blur-xl pointer-events-none"
        style={{ background: auraColor }}
        animate={{
          scale: isAlarmed ? [1, 1.3, 1] : [1, 1.1, 1],
          opacity: isAlarmed ? [0.5, 0.9, 0.5] : [0.3, 0.6, 0.3],
        }}
        transition={{ duration: isAlarmed ? 0.5 : 1.8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Targeting Laser Beam */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "48%",
          left: "68%",
          width: isScanning ? 120 : isAlarmed ? 160 : 60,
          height: isAlarmed ? 2 : 1.5,
          background: `linear-gradient(90deg, ${laserColor}, transparent)`,
          boxShadow: `0 0 8px ${laserColor}`,
          transformOrigin: "left center",
        }}
        animate={{
          opacity: isAlarmed ? [0.6, 1, 0.6] : [0.3, 0.7, 0.3],
          scaleX: isScanning ? [0.8, 1.2, 0.8] : 1,
        }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Human Tactical Combat Soldier SVG */}
      <svg
        viewBox="0 0 120 130"
        className="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="soldierArmor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="60%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          <linearGradient id="camoVest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          <linearGradient id="rifleMetal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Combat Jetpack & Thruster Flame */}
        <g id="jetpack">
          <rect x="34" y="52" width="8" height="24" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <rect x="78" y="52" width="8" height="24" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          {/* Jetpack Thruster Jets */}
          <motion.path
            d="M 36 76 Q 38 88 38 94 Q 40 88 40 76 Z"
            fill={laserColor}
            filter="url(#laserGlow)"
            animate={{
              d: [
                "M 36 76 Q 38 88 38 94 Q 40 88 40 76 Z",
                "M 36 76 Q 37 92 38 100 Q 41 92 40 76 Z",
                "M 36 76 Q 38 88 38 94 Q 40 88 40 76 Z",
              ],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{ duration: 0.3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M 80 76 Q 82 88 82 94 Q 84 88 84 76 Z"
            fill={laserColor}
            filter="url(#laserGlow)"
            animate={{
              d: [
                "M 80 76 Q 82 88 82 94 Q 84 88 84 76 Z",
                "M 80 76 Q 81 92 82 100 Q 85 92 84 76 Z",
                "M 80 76 Q 82 88 82 94 Q 84 88 84 76 Z",
              ],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{ duration: 0.3, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
          />
        </g>

        {/* Soldier Body & Tactical Legs */}
        <g id="soldierLegs">
          {/* Left Combat Boot & Leg */}
          <path d="M 44 88 L 42 108 L 40 114 L 48 114 L 48 108 L 50 88 Z" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
          {/* Right Combat Boot & Leg */}
          <path d="M 70 88 L 72 108 L 72 114 L 80 114 L 78 108 L 76 88 Z" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
          {/* Kneepads */}
          <rect x="42" y="96" width="7" height="6" rx="2" fill="#334155" />
          <rect x="71" y="96" width="7" height="6" rx="2" fill="#334155" />
        </g>

        {/* Tactical Armored Torso */}
        <g id="soldierTorso">
          {/* Combat Vest */}
          <path
            d="M 42 44 L 78 44 L 76 88 L 44 88 Z"
            fill="url(#camoVest)"
            stroke="#475569"
            strokeWidth="1.2"
          />
          {/* Ballistic Plate Insert */}
          <rect x="48" y="48" width="24" height="28" rx="3" fill="url(#soldierArmor)" stroke={laserColor} strokeWidth="0.8" strokeOpacity="0.5" />
          {/* Tactical Chest Webbing / Pouches */}
          <rect x="49" y="66" width="6" height="8" rx="1" fill="#334155" stroke="#1e293b" />
          <rect x="57" y="66" width="6" height="8" rx="1" fill="#334155" stroke="#1e293b" />
          <rect x="65" y="66" width="6" height="8" rx="1" fill="#334155" stroke="#1e293b" />
          {/* Unit Patch Badge */}
          <rect x="56" y="52" width="8" height="6" rx="1" fill={laserColor} opacity="0.8" />
        </g>

        {/* Tactical Arms & Railgun / Assault Rifle */}
        <g id="armsAndWeapon">
          {/* Left Arm holding weapon grip */}
          <path d="M 38 48 L 30 64 L 46 68 L 44 58 Z" fill="url(#soldierArmor)" stroke="#334155" strokeWidth="1" />

          {/* Tactical Assault Rifle Body */}
          <g transform={isAlarmed ? "rotate(-4 60 65)" : "rotate(0 60 65)"}>
            {/* Stock */}
            <rect x="36" y="62" width="12" height="6" rx="1" fill="#0f172a" />
            {/* Receiver & Magazine */}
            <rect x="48" y="58" width="28" height="10" rx="2" fill="url(#rifleMetal)" stroke="#334155" strokeWidth="1" />
            <rect x="54" y="68" width="6" height="9" rx="1" fill="#1e293b" />
            {/* Barrel & Flash Hider */}
            <rect x="76" y="61" width="18" height="4" fill="#334155" />
            <rect x="94" y="60" width="4" height="6" fill="#0f172a" />
            {/* Laser Sight Unit */}
            <rect x="70" y="56" width="8" height="3" fill="#0f172a" />
            <circle cx="78" cy="57.5" r="1.5" fill={laserColor} filter="url(#laserGlow)" />
            {/* Optic Scope */}
            <rect x="54" y="54" width="12" height="4" rx="1" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
            <line x1="56" y1="56" x2="64" y2="56" stroke={laserColor} strokeWidth="1" />
          </g>

          {/* Right Arm supporting rifle */}
          <path d="M 82 48 L 90 64 L 74 68 L 74 58 Z" fill="url(#soldierArmor)" stroke="#334155" strokeWidth="1" />
          {/* Tactical Combat Gloves */}
          <circle cx="44" cy="67" r="3.5" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
          <circle cx="74" cy="67" r="3.5" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
        </g>

        {/* Combat Tactical Helmet & Head */}
        <g id="soldierHead">
          {/* Head & Neck */}
          <rect x="52" y="38" width="16" height="8" fill="#1e293b" />

          {/* Helmet Dome */}
          <path
            d="M 44 26 C 44 14 76 14 76 26 L 78 36 L 42 36 Z"
            fill="url(#soldierArmor)"
            stroke="#475569"
            strokeWidth="1.4"
          />

          {/* Tactical Helmet Rails & Comm Headset */}
          <rect x="40" y="24" width="4" height="10" rx="1" fill="#334155" />
          <rect x="76" y="24" width="4" height="10" rx="1" fill="#334155" />
          <line x1="78" y1="20" x2="82" y2="10" stroke={laserColor} strokeWidth="1.5" />
          <circle cx="82" cy="10" r="1.5" fill={laserColor} />

          {/* Dual Tactical HUD Visor Goggles */}
          <rect
            x="46"
            y="26"
            width="28"
            height="8"
            rx="2"
            fill="#020617"
            stroke={visorColor}
            strokeWidth="1.2"
          />
          {/* Left Optic Lens */}
          <circle cx="53" cy="30" r="2.5" fill={visorColor} filter="url(#laserGlow)" />
          {/* Right Optic Lens */}
          <circle cx="67" cy="30" r="2.5" fill={visorColor} filter="url(#laserGlow)" />

          {/* Tactical Half-Face Respirator / Balaclava */}
          <polygon points="48,34 72,34 66,42 54,42" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <circle cx="60" cy="38" r="2" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
        </g>

        {/* Firing Muzzle Flash Effect */}
        {firing && (
          <g>
            <circle cx="98" cy="63" r="6" fill={laserColor} filter="url(#laserGlow)" />
            <line x1="98" y1="63" x2="160" y2="63" stroke="#ffffff" strokeWidth="3" filter="url(#laserGlow)" />
          </g>
        )}
      </svg>
    </div>
  );
}
