import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PhishSpotter } from "@/components/PhishSpotter";
import { Shield, Lock, Smartphone, AlertOctagon, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Citizen Threat Radar",
  description: "Test your awareness against real Bangladesh phishing scams.",
};

const RULES = [
  { t: "Inspect Root Domains", d: "Always read from the right: bank.com.bd.login.xyz is owned by login.xyz.", icon: Shield },
  { t: "Never Share OTP / PIN", d: "No genuine bKash, Nagad, or bank staff will ever ask for your 6-digit code.", icon: Lock },
  { t: "Beware Fake SMS Urgency", d: "'Account blocked in 2 hours' is a classic scam pressure tactic.", icon: Smartphone },
  { t: "Official App Stores Only", d: "Never install APK links sent via WhatsApp, Facebook, or SMS.", icon: AlertOctagon },
];

export default function CitizensPage() {
  return (
    <div className="pb-24 pt-6">
      <PageHeader
        eyebrow="Interactive Threat Challenge"
        title={<>Can you spot the <span className="text-gradient">phishing trap?</span></>}
      >
        Test your instincts against real-world SMS, fake bKash alerts, and lookalike bank portals targeting people in Bangladesh.
      </PageHeader>

      {/* Main Interactive Game Centerpiece */}
      <div className="mt-6">
        <PhishSpotter />
      </div>

      {/* 4 Punchy Rules (No long paragraphs!) */}
      <div className="mt-12">
        <h3 className="text-lg font-bold text-white mb-4">4 Rules of Online Vigilance</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RULES.map((r, i) => {
            const Icon = r.icon;
            return (
              <div key={r.t} className="glass-panel rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-emerald-400">0{i + 1}</span>
                  <Icon className="h-4 w-4 text-slate-300" />
                </div>
                <h4 className="text-sm font-bold text-white">{r.t}</h4>
                <p className="mt-1 text-xs text-mute leading-relaxed">{r.d}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
