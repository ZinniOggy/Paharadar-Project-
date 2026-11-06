"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAgent } from "./AgentProvider";
import { SPEEDS, type Speed } from "./agent.config";
import { answerFor, lineFor, type Line } from "@/lib/guide";
import { Sparkles, X, ChevronRight, MessageSquare } from "lucide-react";

const LABEL: Record<Speed, string> = { chill: "Slow", normal: "Normal", zippy: "Fast" };

function useTypewriter(text: string, resetKey: string) {
  const [n, setN] = useState(0);
  const instant = useRef(false);

  useEffect(() => {
    instant.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    setN(0);
  }, [resetKey]);

  useEffect(() => {
    if (n >= text.length) return;
    const t = setTimeout(
      () => setN((v) => Math.min(v + (instant.current ? 999 : 2), text.length)),
      16
    );
    return () => clearTimeout(t);
  }, [n, text]);

  return { shown: text.slice(0, n), done: n >= text.length, skip: () => setN(text.length) };
}

export function GuideChat() {
  const { guide, chatOpen, setChatOpen, setMood, bumpReact, speed, setSpeed, follow, setFollow, actions } =
    useAgent();
  const [introSeen, setIntroSeen] = useState(false);
  const [extra, setExtra] = useState<Line | null>(null);

  const base = useMemo(() => lineFor(guide, introSeen), [guide, introSeen]);
  const line = extra ?? base;
  const { shown, done, skip } = useTypewriter(line.text, extra ? `x-${extra.key}` : base.key);

  // Auto-open on initial load
  useEffect(() => {
    const t = setTimeout(() => setChatOpen(true), 900);
    return () => clearTimeout(t);
  }, [setChatOpen]);

  useEffect(() => {
    setExtra(null);
    bumpReact();
  }, [base.key, bumpReact]);

  useEffect(() => {
    setMood(line.mood);
  }, [line.mood, setMood]);

  const choose = (id: string) => {
    const reply = answerFor(id, guide);
    if (reply) {
      setExtra(reply);
      return;
    }
    setIntroSeen(true);
    actions.current.run(id);
  };

  return (
    <>
      {/* Floating Minimized Trigger Button */}
      {!chatOpen && (
        <motion.button
          id="guide-button"
          onClick={() => setChatOpen(true)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full border border-white/10 bg-black/60 px-4 py-2.5 shadow-2xl backdrop-blur-xl hover:border-emerald-400/40"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-xs font-medium text-white">Ask Pahara</span>
        </motion.button>
      )}

      {/* Expanded Translucent Speech Card */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            id="guide-box"
            role="dialog"
            aria-label="Pahara Guide"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-40 w-[min(380px,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-black/70 p-5 shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-white">
                  Pahara · Security Companion
                </span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                aria-label="Minimize Guide"
                className="rounded-lg p-1 text-mute hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content text */}
            <p
              onClick={skip}
              className="mt-3.5 min-h-[4rem] cursor-pointer text-sm leading-relaxed text-slate-200"
            >
              {shown}
              {!done && (
                <span className="ml-1 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-emerald-400" />
              )}
            </p>

            {/* Clickable Quick Action Choices */}
            {done && line.choices.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex flex-col gap-1.5"
              >
                {line.choices.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => choose(c.id)}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2 text-left text-xs font-medium text-slate-300 transition-all hover:border-emerald-400/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                  >
                    <span>{c.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-emerald-400/70" />
                  </button>
                ))}
              </motion.div>
            )}

            {/* Bottom Controls */}
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-mute">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={follow}
                  onChange={(e) => setFollow(e.target.checked)}
                  className="rounded border-white/20 bg-black/40 accent-emerald-400"
                />
                <span>Follow pointer</span>
              </label>

              <div className="flex items-center gap-1">
                {(["chill", "normal", "zippy"] as Speed[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`rounded px-1.5 py-0.5 ${
                      speed === s ? "bg-emerald-500/20 text-emerald-300 font-semibold" : "text-mute hover:text-white"
                    }`}
                  >
                    {LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
