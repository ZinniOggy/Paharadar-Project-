"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAgent, type CharacterModel } from "./AgentProvider";
import { SPEEDS, type Speed } from "./agent.config";
import { answerFor, lineFor, type Line } from "@/lib/guide";
import { X, ChevronRight, Shield, Bot } from "lucide-react";

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
  const {
    guide,
    chatOpen,
    setChatOpen,
    setMood,
    bumpReact,
    speed,
    setSpeed,
    follow,
    setFollow,
    characterModel,
    setCharacterModel,
    actions,
  } = useAgent();
  const [introSeen, setIntroSeen] = useState(false);
  const [extra, setExtra] = useState<Line | null>(null);

  const base = useMemo(() => lineFor(guide, introSeen), [guide, introSeen]);
  const line = extra ?? base;
  const { shown, done, skip } = useTypewriter(line.text, extra ? `x-${extra.key}` : base.key);

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

  const handleSpeedChange = (s: Speed) => {
    setSpeed(s);
    bumpReact();
  };

  return (
    <>
      {/* Floating Minimized Trigger Button: "Ask Pahara" */}
      {!chatOpen && (
        <motion.button
          id="guide-button"
          onClick={() => setChatOpen(true)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-black/80 px-4 py-2.5 shadow-[0_0_20px_rgba(0,242,180,0.25)] backdrop-blur-xl hover:border-emerald-400 hover:shadow-[0_0_25px_rgba(0,242,180,0.4)]"
        >
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
          <span className="text-xs font-bold text-white tracking-wide">Ask Pahara</span>
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
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-40 w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-black/85 p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
          >
            {/* Header: "Pahara · Security Companion" */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#00f2b4]" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
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

            {/* Model Selector Bar: Only 2 Rock-Solid Options (Soldier & Mecha Droid) */}
            <div className="mt-3 flex items-center justify-between bg-white/[0.04] p-1.5 rounded-xl border border-white/5 text-[11px]">
              <span className="text-mute px-1 font-medium">Actor:</span>
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: "soldier", label: "Soldier", icon: Shield },
                    { id: "mecha", label: "Mecha Droid", icon: Bot },
                  ] as { id: CharacterModel; label: string; icon: any }[]
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setCharacterModel(id);
                      bumpReact();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                      characterModel === id
                        ? "bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/40 shadow-[0_0_10px_rgba(0,242,180,0.2)]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content text */}
            <p
              onClick={skip}
              className="mt-3.5 min-h-[3.6rem] cursor-pointer text-sm leading-relaxed text-slate-200"
            >
              {shown}
              {!done && (
                <span className="ml-1 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-emerald-400 shadow-[0_0_6px_#00f2b4]" />
              )}
            </p>

            {/* Clickable Quick Action Choices */}
            {done && line.choices.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex flex-col gap-1.5"
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

            {/* Bottom Controls: Follow Pointer Checkbox + Fast/Normal/Slow Buttons */}
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-mute">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={follow}
                  onChange={(e) => {
                    setFollow(e.target.checked);
                    bumpReact();
                  }}
                  className="rounded border-white/20 bg-black/40 accent-emerald-400"
                />
                <span className="text-slate-300 font-medium">Follow Pointer</span>
              </label>

              <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/5">
                {(["chill", "normal", "zippy"] as Speed[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSpeedChange(s)}
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-all ${
                      speed === s
                        ? "bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-400/30 shadow-[0_0_8px_rgba(0,242,180,0.3)]"
                        : "text-mute hover:text-white"
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
