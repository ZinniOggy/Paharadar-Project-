"use client";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import type { MutableRefObject } from "react";
import type { Mood } from "./moods";
import { SPEEDS, type Speed } from "./agent.config";
import { INITIAL_GUIDE, type GuideState } from "@/lib/guide";

export type CharacterModel = "soldier" | "mecha";

type Actions = { run: (id: string) => void };

type Ctx = {
  mood: Mood; setMood: (m: Mood) => void;
  speed: Speed; setSpeed: (s: Speed) => void;
  follow: boolean; setFollow: (f: boolean) => void;
  chatOpen: boolean; setChatOpen: (o: boolean) => void;
  characterModel: CharacterModel; setCharacterModel: (m: CharacterModel) => void;
  guide: GuideState; setGuide: (p: Partial<GuideState>) => void;
  reactKey: number; bumpReact: () => void;
  actions: MutableRefObject<Actions>;
};

const AgentCtx = createContext<Ctx | null>(null);

export function useAgent() {
  const c = useContext(AgentCtx);
  if (!c) throw new Error("useAgent must be used inside AgentProvider");
  return c;
}

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [mood, setMood] = useState<Mood>("idle");
  const [speed, setSpeedState] = useState<Speed>("normal");
  const [follow, setFollowState] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [characterModel, setCharacterModelState] = useState<CharacterModel>("soldier");
  const [guide, setGuideState] = useState<GuideState>(INITIAL_GUIDE);
  const [reactKey, setReactKey] = useState(0);
  const actions = useRef<Actions>({ run: () => {} });

  useEffect(() => {
    try {
      const s = localStorage.getItem("pahara:speed");
      if (s && s in SPEEDS) setSpeedState(s as Speed);
      const f = localStorage.getItem("pahara:follow");
      if (f !== null) setFollowState(f === "1");
      const m = localStorage.getItem("pahara:char_model");
      if (m === "soldier" || m === "mecha") setCharacterModelState(m);
    } catch { /* storage unavailable */ }
  }, []);

  const setSpeed = useCallback((s: Speed) => {
    setSpeedState(s);
    try { localStorage.setItem("pahara:speed", s); } catch { /* ignore */ }
  }, []);

  const setFollow = useCallback((f: boolean) => {
    setFollowState(f);
    try { localStorage.setItem("pahara:follow", f ? "1" : "0"); } catch { /* ignore */ }
  }, []);

  const setCharacterModel = useCallback((m: CharacterModel) => {
    setCharacterModelState(m);
    try { localStorage.setItem("pahara:char_model", m); } catch { /* ignore */ }
  }, []);

  const setGuide = useCallback((p: Partial<GuideState>) => setGuideState((g) => ({ ...g, ...p })), []);
  const bumpReact = useCallback(() => setReactKey((k) => k + 1), []);

  const value = useMemo(
    () => ({
      mood, setMood,
      speed, setSpeed,
      follow, setFollow,
      chatOpen, setChatOpen,
      characterModel, setCharacterModel,
      guide, setGuide,
      reactKey, bumpReact,
      actions,
    }),
    [mood, speed, setSpeed, follow, setFollow, chatOpen, characterModel, setCharacterModel, guide, setGuide, reactKey, bumpReact]
  );

  return <AgentCtx.Provider value={value}>{children}</AgentCtx.Provider>;
}
