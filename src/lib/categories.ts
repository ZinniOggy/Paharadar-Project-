import type { Category } from "./types";

export const CATS: Record<Category, { label: string; tone: string; bar: string; effort: string }> = {
  transport: { label: "TLS & Transport", tone: "border-cyan-500/50 text-cyan-400", bar: "bg-cyan-500", effort: "25 min" },
  headers: { label: "Defensive Headers", tone: "border-emerald-500/50 text-emerald-400", bar: "bg-emerald-400", effort: "5 min" },
  exposure: { label: "Attack Surface / Exposure", tone: "border-rose-500/50 text-rose-400", bar: "bg-rose-500", effort: "15 min" },
  email: { label: "Email DNS Spoofing", tone: "border-amber-500/50 text-amber-400", bar: "bg-amber-500", effort: "20 min" },
  sessions: { label: "Cookie & Session Security", tone: "border-emerald-500/50 text-emerald-300", bar: "bg-emerald-500", effort: "10 min" },
  process: { label: "Disclosure & Contact", tone: "border-line text-mute", bar: "bg-mute", effort: "10 min" },
};

export const CAT_ORDER: Category[] = ["transport", "headers", "exposure", "email", "sessions", "process"];
