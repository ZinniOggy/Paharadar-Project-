"use client";
import { useEffect, useState } from "react";
import { CyberSoldier } from "./CyberSoldier";
import { MechaSentinel } from "./MechaSentinel";
import { useAgent } from "./AgentProvider";
import type { Mood } from "./moods";

export function Character({
  mood,
  reactKey = 0,
}: {
  mood: Mood;
  reactKey?: number;
}) {
  const { characterModel } = useAgent();
  const [firing, setFiring] = useState(false);

  // Trigger firing pulse on interaction
  useEffect(() => {
    if (reactKey > 0) {
      setFiring(true);
      const t = setTimeout(() => setFiring(false), 450);
      return () => clearTimeout(t);
    }
  }, [reactKey]);

  if (characterModel === "mecha") {
    return <MechaSentinel mood={mood} size={110} firing={firing} />;
  }

  // Default: Human Tactical Combat Soldier
  return <CyberSoldier mood={mood} size={115} firing={firing} />;
}
