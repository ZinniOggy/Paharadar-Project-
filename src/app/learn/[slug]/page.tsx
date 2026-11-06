import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICLES, getArticle } from "@/lib/learn";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { ArrowLeft, ArrowRight, ExternalLink, AlertTriangle } from "lucide-react";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle(slug);
  return { title: a?.title ?? "Guide not found", description: a?.lead };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) notFound();
  const next = ARTICLES[(ARTICLES.findIndex((x) => x.slug === slug) + 1) % ARTICLES.length];

  return (
    <article className="pb-24 pt-6">
      <Link
        href="/learn"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-mute hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to all guides</span>
      </Link>

      <PageHeader eyebrow={`${a.tag} · ${a.minutes} MIN READ`} title={a.title}>
        {a.lead}
      </PageHeader>

      <div className="mt-8 max-w-3xl space-y-8">
        <Reveal>
          <div className="glass-panel rounded-3xl p-6 sm:p-7">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-2">
              01 · What It Is
            </span>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">{a.what}</p>
          </div>
        </Reveal>

        <Reveal>
          <div className="glass-panel rounded-3xl p-6 sm:p-7">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-2">
              02 · Why It Matters
            </span>
            <p className="text-sm sm:text-base text-mute leading-relaxed">{a.why}</p>
          </div>
        </Reveal>

        <Reveal>
          <div className="glass-panel rounded-3xl p-6 sm:p-7">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-3">
              03 · Implementation Steps
            </span>
            <ol className="space-y-3 text-sm">
              {a.how.map((s, i) => (
                <li key={i} className="flex items-start gap-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-400 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-slate-200 leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>

        <Reveal>
          <div className="glass-panel rounded-3xl p-6 sm:p-7 border-red-500/30">
            <div className="flex items-center gap-2 text-red-400 text-xs uppercase font-bold tracking-wider mb-3">
              <AlertTriangle className="h-4 w-4" />
              <span>Common Pitfalls to Avoid</span>
            </div>
            <ul className="space-y-2 text-sm text-mute">
              {a.pitfalls.map((s, i) => (
                <li key={i} className="border-l-2 border-red-500/60 pl-3 leading-relaxed">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal>
          <a
            href={a.docs}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300"
          >
            <span>Read official MDN / RFC documentation</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Reveal>
      </div>

      <Reveal className="mt-12">
        <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6 sm:p-7">
          <div>
            <h3 className="text-base font-bold text-white">
              Check your website for this issue
            </h3>
            <p className="mt-1 text-xs text-mute">
              Run a free scan to see if this configuration is active.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/scan"
              className="btn-primary rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
            >
              Scan Website
            </Link>
            <Link
              href={`/learn/${next.slug}`}
              className="btn-secondary rounded-full px-5 py-2.5 text-xs font-semibold"
            >
              Next Guide →
            </Link>
          </div>
        </div>
      </Reveal>
    </article>
  );
}
