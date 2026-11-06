"use client";
import { motion } from "motion/react";

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <div className="pb-8 pt-8 md:pt-14">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span>{eyebrow}</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.5, ease }}
        className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-white md:text-5xl leading-tight"
      >
        {title}
      </motion.h1>

      {children && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease }}
          className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-mute"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}
