import type { Mood } from "./moods";

// Catch-up physics constants (per second) and animation durations.
// Highly calibrated for distinct tactile feel:
// - chill: Slow, gentle glider (rate: 1.8, 4.0s hover)
// - normal: Balanced natural follower (rate: 9.0, 2.0s hover)
// - zippy: Hyper-fast, instantaneous lock-on darting (rate: 45.0, 0.75s hover)
export const SPEED_CONFIG = {
  chill: { rate: 1.8, bobDuration: 4.0, label: "Slow", description: "Gentle floating glide" },
  normal: { rate: 9.0, bobDuration: 2.0, label: "Normal", description: "Balanced follower" },
  zippy: { rate: 45.0, bobDuration: 0.75, label: "Fast", description: "Hyper-responsive darting" },
} as const;

export const SPEEDS = {
  chill: SPEED_CONFIG.chill.rate,
  normal: SPEED_CONFIG.normal.rate,
  zippy: SPEED_CONFIG.zippy.rate,
} as const;

export type Speed = keyof typeof SPEEDS;

export const AGENT = {
  size: 115,
  facesRight: true,
  busyMoods: ["scanning", "alarmed"] as Mood[],
};
