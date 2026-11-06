import type { Metadata } from "next";
import Link from "next/link";
import { ARTICLES } from "@/lib/learn";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { Clock, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Security Guides",
  description: "Practical engineering guides on web headers, SSL/TLS, and DNS anti-spoofing.",
};

export default function LearnPage() {
  return (
    <div className="pb-24 pt-6">
      <PageHeader
        eyebrow="Knowledge Base"
        title={<>Security fundamentals, <span className="text-gradient">in plain words.</span></>}
      >
        Direct, actionable tutorials explaining HTTP response headers, SSL/TLS certificates, and email spoofing protection in clear terms.
      </PageHeader>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {ARTICLES.map((a, i) => (
          <Reveal key={a.slug} delay={(i % 3) * 0.06}>
            <Link href={`/learn/${a.slug}`} className="block h-full group">
              <div className="glass-panel h-full rounded-3xl p-6 transition-all group-hover:border-emerald-400/40">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                    {a.tag}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-mute">
                    <Clock className="h-3 w-3" />
                    {a.minutes} min read
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {a.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-mute leading-relaxed">{a.lead}</p>
                <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 pt-4 border-t border-white/[0.08]">
                  <span>Read field guide</span>
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
