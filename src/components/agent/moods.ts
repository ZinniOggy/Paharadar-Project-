export type Mood = "idle" | "curious" | "scanning" | "happy" | "worried" | "alarmed";

export const GLOW: Record<Mood, string> = {
  idle: "#00ff88",
  curious: "#06b6d4",
  scanning: "#00ff88",
  happy: "#10b981",
  worried: "#f59e0b",
  alarmed: "#f43f5e",
};
