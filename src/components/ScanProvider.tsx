"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { useScan } from "@/hooks/useScan";
import type { Finding } from "@/lib/types";

type Ctx = ReturnType<typeof useScan> & {
  input: string; setInput: (v: string) => void;
  consent: boolean; setConsent: (v: boolean) => void;
  open: Finding | null; setOpen: (f: Finding | null) => void;
  start: (domain?: string) => boolean;
};

const C = createContext<Ctx | null>(null);

export function useScanCtx() {
  const c = useContext(C);
  if (!c) throw new Error("useScanCtx must be used inside ScanProvider");
  return c;
}

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const scan = useScan();
  const [input, setInput] = useState("");
  const [consent, setConsent] = useState(false);
  const [open, setOpen] = useState<Finding | null>(null);

  const start = useCallback((d?: string) => {
    const dom = (d ?? input).trim();
    if (!dom || !consent) return false;
    setOpen(null);
    scan.run(dom, true);
    return true;
  }, [input, consent, scan.run]); // eslint-disable-line react-hooks/exhaustive-deps

  return <C.Provider value={{ ...scan, input, setInput, consent, setConsent, open, setOpen, start }}>{children}</C.Provider>;
}