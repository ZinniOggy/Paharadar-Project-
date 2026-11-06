import type { Mood } from "./moods";

// How quickly the agent catches up with its target (per second). Higher = faster.
export const SPEEDS = { chill: 2, normal: 4.5, zippy: 10 } as const;
export type Speed = keyof typeof SPEEDS;

export const AGENT = {
  src: "/rive/thurtdeath.riv",
  size: 200,
  facesRight: false,   // the turtle’s head is on the left. If it flies backwards, set true
  anim: {
    calm: /first\s*fly/i,
    busy: /second\s*fly/i,
    click: /^c[il]ick/i,   // "CIICK 1…5": played when the agent speaks
  },
  busyMoods: ["scanning", "alarmed"] as Mood[],
};