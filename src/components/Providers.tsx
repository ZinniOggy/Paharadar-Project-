"use client";
import { MotionConfig } from "motion/react";
import { AgentProvider } from "./agent/AgentProvider";
import { FlyingAgent } from "./agent/FlyingAgent";
import { GuideChat } from "./agent/GuideChat";
import { ScanProvider } from "./ScanProvider";
import { GuideBridge } from "./GuideBridge";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AgentProvider>
        <ScanProvider>
          {children}
          <GuideBridge />
          <GuideChat />
          <FlyingAgent />
        </ScanProvider>
      </AgentProvider>
    </MotionConfig>
  );
}