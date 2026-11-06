"use client";
import { Doyel } from "./Doyel";
import type { Mood } from "./moods";

export function Character({ mood }: { mood: Mood; reactKey?: number }) {
  return (
    <div className="relative flex items-center justify-center filter drop-shadow-[0_0_16px_rgba(0,242,180,0.5)]">
      <Doyel mood={mood} size={90} />
    </div>
  );
}
