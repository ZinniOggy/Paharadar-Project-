export const SEV = {
  critical: {
    label: "CRITICAL",
    badge: "border border-red-500/50 bg-red-500/15 text-red-400 font-semibold",
    bar: "bg-red-500",
  },
  warn: {
    label: "WARNING",
    badge: "border border-amber-500/50 bg-amber-500/15 text-amber-400 font-semibold",
    bar: "bg-amber-500",
  },
  info: {
    label: "INFO",
    badge: "border border-cyan-500/50 bg-cyan-500/15 text-cyan-400 font-medium",
    bar: "bg-cyan-500",
  },
  pass: {
    label: "PASS",
    badge: "border border-emerald-500/50 bg-emerald-500/15 text-emerald-400 font-semibold",
    bar: "bg-emerald-400",
  },
} as const;
