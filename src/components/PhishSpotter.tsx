"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, ArrowRight, RotateCcw } from "lucide-react";

type Item = { kind: "URL" | "SMS" | "Email"; text: string; bad: boolean; why: string };

const ITEMS: Item[] = [
  {
    kind: "URL",
    text: "https://sonalibank.com.bd/online-portal",
    bad: false,
    why: "Legitimate HTTPS connection matching the official bank domain without suspicious prefixes or typosquatting.",
  },
  {
    kind: "URL",
    text: "https://bkash.com.bd.service-verify99.xyz/claim-cashback",
    bad: true,
    why: "Classic decoy domain. Read from the right: the host is 'service-verify99.xyz'. The brand name is merely a subdomain trick.",
  },
  {
    kind: "SMS",
    text: "bKash Alert: Your account is suspended due to NID mismatch. Send your 5-digit PIN and latest OTP to 017XXXXXX to unfreeze.",
    bad: true,
    why: "Direct PIN/OTP theft. Genuine Mobile Financial Services (MFS) never request user PINs or OTPs via SMS or phone calls.",
  },
  {
    kind: "SMS",
    text: "Nagad: Your OTP is 849201 for merchant payment of BDT 1,200. Do not share this code with anyone.",
    bad: false,
    why: "Standard verification OTP with explicit warnings against disclosure. Be cautious only if you didn't initiate the transaction.",
  },
  {
    kind: "URL",
    text: "http://bangladesh-post-parcel-tracking.com/pay-duty",
    bad: true,
    why: "Unencrypted HTTP link on an unofficial hyphenated lookalike domain asking for duty payments.",
  },
  {
    kind: "Email",
    text: "From security@bracbank.com: We observed a new device login from Chittagong. If this was not you, lock your card immediately in the BRAC Bank app.",
    bad: false,
    why: "Security advisory that doesn't push a shady external link and instructs you to use the official mobile application.",
  },
  {
    kind: "SMS",
    text: "Ministry of ICT: You have received a Tk 25,000 education grant. Click tinyurl.com/bd-edu-2026 to submit your bank credentials within 2 hours.",
    bad: true,
    why: "Fake urgency, unverified shortened URL, and an unrealistic government grant promise designed to harvest banking credentials.",
  },
];

const ROUNDS = 5;

const shuffle = <T,>(a: T[]): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

export function PhishSpotter() {
  const [deck, setDeck] = useState<Item[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);
  const [right, setRight] = useState(0);
  const [phase, setPhase] = useState<"intro" | "play" | "end">("intro");

  const start = () => {
    setDeck(shuffle(ITEMS).slice(0, ROUNDS));
    setI(0);
    setPicked(null);
    setRight(0);
    setPhase("play");
  };

  const answer = (sayBad: boolean) => {
    if (picked !== null) return;
    setPicked(sayBad);
    if (sayBad === deck[i].bad) setRight((n) => n + 1);
  };

  const next = () => {
    if (i + 1 >= deck.length) setPhase("end");
    else {
      setI(i + 1);
      setPicked(null);
    }
  };

  const item = deck[i];
  const correct = item && picked !== null && picked === item.bad;

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-9 shadow-2xl">
      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-2 text-emerald-400 text-xs uppercase font-bold tracking-wider mb-2">
              <ShieldAlert className="h-4 w-4" />
              <span>Interactive Threat Training</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Citizen Phishing Radar</h3>
            <p className="mt-3 max-w-xl text-sm sm:text-base text-mute leading-relaxed">
              Test your ability to distinguish legitimate banking and MFS notifications (bKash/Nagad) from phishing lures and fake government URLs in Bangladesh.
            </p>
            <button
              onClick={start}
              className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-7 py-3 text-xs font-bold uppercase tracking-wider"
            >
              <span>Start Challenge</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}

        {phase === "play" && item && (
          <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-mute pb-4 border-b border-white/[0.08]">
              <span>Round {i + 1} of {deck.length}</span>
              <span className="text-emerald-400 font-bold">{right} Correct</span>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs font-semibold">
              <span className="text-mute uppercase">Message Channel:</span>
              <span className="rounded-full bg-white/[0.08] px-2.5 py-0.5 text-white uppercase">{item.kind}</span>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-black/60 p-5 sm:p-6 text-base sm:text-lg text-white leading-relaxed break-words font-medium">
              &ldquo;{item.text}&rdquo;
            </div>

            {picked === null ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => answer(false)}
                  className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-6 py-3 text-xs font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/20 transition-all flex items-center gap-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Looks Safe</span>
                </button>
                <button
                  onClick={() => answer(true)}
                  className="rounded-full border border-red-500/40 bg-red-500/10 px-6 py-3 text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Suspicious / Phishing</span>
                </button>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <div className="flex items-center gap-2">
                  {correct ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span className="text-base font-bold text-emerald-400">Correct Assessment!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-400" />
                      <span className="text-base font-bold text-red-400">Not Quite Safe</span>
                    </>
                  )}
                </div>
                <p className="mt-2 text-xs sm:text-sm text-mute leading-relaxed">{item.why}</p>
                <button
                  onClick={next}
                  className="btn-primary mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider"
                >
                  <span>{i + 1 >= deck.length ? "View Summary" : "Next Example"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        )}

        {phase === "end" && (
          <motion.div key="end" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-mute">Assessment Score</span>
            <div className="mt-2 text-6xl font-black text-gradient">{right} / {deck.length}</div>
            <p className="mt-4 max-w-lg text-sm text-mute leading-relaxed">
              {right === deck.length
                ? "Perfect vigilance! You recognized the telltale signs of brand spoofing, fake urgency, and code extraction."
                : right >= deck.length - 2
                ? "Strong instincts. Always verify the true root domain at the end of the web address before signing in."
                : "Good practice. Remember the golden rule: never share an OTP or PIN with anyone, even someone claiming to be official staff."}
            </p>
            <button
              onClick={start}
              className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-wider"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Try Again</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
