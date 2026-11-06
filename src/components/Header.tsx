"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Shield, Menu, X, ArrowRight } from "lucide-react";

const NAV = [
  { href: "/scan", label: "Scanner" },
  { href: "/compare", label: "Compare" },
  { href: "/tools", label: "Config Tools" },
  { href: "/citizens", label: "Threat Radar" },
  { href: "/history", label: "Dashboard" },
  { href: "/api-docs", label: "API" },
  { href: "/about", label: "About" },
];

export function Header() {
  const path = usePathname();
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    setMenu(false);
  }, [path]);

  const active = (h: string) => path === h || path.startsWith(`${h}/`);

  return (
    <header
      data-noprint
      className="sticky top-0 z-40 border-b border-white/[0.07] bg-black/50 backdrop-blur-2xl transition-all"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-emerald-400 transition-colors group-hover:border-emerald-400/40">
            <Shield className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              Paharadar
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                v2
              </span>
            </span>
            <span className="text-[11px] text-mute tracking-wide">Web Security Sentinel</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main Navigation">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`relative px-3 py-1.5 text-xs font-medium transition-colors ${
                active(n.href) ? "text-white font-semibold" : "text-mute hover:text-white"
              }`}
            >
              {n.label}
              {active(n.href) && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute inset-x-2 -bottom-[17px] h-[2px] bg-emerald-400 shadow-[0_0_12px_#00f2b4]"
                />
              )}
            </Link>
          ))}
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <Link
            href="/scan"
            className="btn-primary hidden rounded-full px-4 py-2 text-xs font-bold sm:inline-flex items-center gap-1.5 uppercase tracking-wider"
          >
            <span>Scan Website</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <button
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-label="Toggle navigation menu"
            className="rounded-xl border border-white/10 p-2 text-mute hover:border-white/20 hover:text-white lg:hidden"
          >
            {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {menu && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/[0.08] bg-black/95 backdrop-blur-2xl px-6 py-4 lg:hidden"
            aria-label="Mobile Navigation"
          >
            <div className="flex flex-col gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    active(n.href)
                      ? "bg-white/[0.08] text-emerald-400 font-semibold"
                      : "text-mute hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  {n.label}
                </Link>
              ))}
              <Link
                href="/scan"
                className="btn-primary mt-3 rounded-xl py-3 text-center text-xs font-bold uppercase tracking-wider"
              >
                Scan a Website Now
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
