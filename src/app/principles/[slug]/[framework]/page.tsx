import { notFound } from "next/navigation";
import Link from "next/link";
import { authFrameworks, getFramework } from "@/lib/auth-frameworks";
import { highlightCode } from "@/lib/highlight";

interface Props {
  params: Promise<{ slug: string; framework: string }>;
}

export async function generateStaticParams() {
  return authFrameworks.map(f => ({ slug: "authentication", framework: f.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { framework: fSlug } = await params;
  const f = getFramework(fSlug);
  if (!f) return {};
  return {
    title: `${f.name} — Authentication Framework — arch.design`,
    description: f.tagline,
  };
}

const ARCH_LABEL: Record<string, string> = {
  monolith:      "Monolith",
  microservice:  "Microservice",
  both:          "Monolith or Microservice",
  saas:          "Managed SaaS",
};

const TYPE_STYLE: Record<string, string> = {
  library:    "bg-violet-500/15 text-violet-400 border-violet-500/20",
  saas:       "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  primitives: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const HOSTING_STYLE: Record<string, string> = {
  "self-hosted": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  managed:       "bg-rose-500/15 text-rose-400 border-rose-500/20",
};

function PopularityStars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-sm ${i < value ? "text-amber-400" : "text-zinc-700"}`}>★</span>
      ))}
    </div>
  );
}

export default async function FrameworkPage({ params }: Props) {
  const { slug, framework: fSlug } = await params;
  if (slug !== "authentication") notFound();
  const f = getFramework(fSlug);
  if (!f) notFound();

  const html = await highlightCode(f.setupCode, "typescript");

  const others = authFrameworks.filter(x => x.slug !== f.slug);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-12">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/principles" className="hover:text-zinc-300 transition-colors">Principles</Link>
        <span>/</span>
        <Link href="/principles/authentication" className="hover:text-zinc-300 transition-colors">Authentication</Link>
        <span>/</span>
        <span className="text-zinc-300">{f.name}</span>
      </div>

      {/* Header */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 items-center">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_STYLE[f.type]}`}>
            {f.type}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${HOSTING_STYLE[f.hosting]}`}>
            {f.hosting}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-500 font-mono">
            {ARCH_LABEL[f.architectureFit]}
          </span>
          {f.openSource && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-zinc-800 text-zinc-500">
              open source
            </span>
          )}
        </div>
        <h1 className="text-4xl font-bold text-white leading-tight">{f.name}</h1>
        <p className="text-lg text-zinc-400 leading-relaxed">{f.tagline}</p>
        <div className="flex items-center gap-4">
          <PopularityStars value={f.popularity} />
          <a
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-mono border border-violet-900/40 px-2 py-0.5 rounded hover:border-violet-700/60"
          >
            {f.url.replace("https://", "")} ↗
          </a>
        </div>
      </header>

      {/* Description */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-white">Overview</h2>
        <div className="text-zinc-400 leading-relaxed flex flex-col gap-3">
          {f.description.split("\n\n").map((para, i) => <p key={i}>{para}</p>)}
        </div>
      </section>

      {/* Architecture fit */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-white">Architecture fit</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono px-2 py-0.5 rounded border ${HOSTING_STYLE[f.hosting]}`}>
              {f.hosting}
            </span>
            <span className="text-sm text-zinc-300 font-medium">{ARCH_LABEL[f.architectureFit]}</span>
          </div>
          {f.architectureFit === "both" && (
            <div className="grid sm:grid-cols-2 gap-3 text-xs text-zinc-400">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <span className="text-zinc-200 font-semibold block mb-1">As part of a monolith</span>
                Runs inside your app process, shares the same database. Single catch-all route handles all auth endpoints. Zero extra infrastructure.
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <span className="text-zinc-200 font-semibold block mb-1">As a standalone microservice</span>
                Deployed as a separate service with its own database. Other services validate tokens against it. Enables SSO across multiple apps.
              </div>
            </div>
          )}
          {f.architectureFit === "monolith" && (
            <p className="text-xs text-zinc-400">Best suited to run inside your main application process alongside your app logic and database.</p>
          )}
          {f.architectureFit === "saas" && (
            <p className="text-xs text-zinc-400">Fully managed — you call their API and embed their components. Users are stored on their infrastructure, not yours.</p>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-white">Key features</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {f.features.map((feat, i) => (
            <div key={i} className="flex gap-2 text-sm text-zinc-400 leading-snug">
              <span className="text-violet-500 shrink-0 mt-0.5">◈</span>
              {feat}
            </div>
          ))}
        </div>
      </section>

      {/* Trade-offs */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-white">Trade-offs</h2>
        <div className="grid gap-3">
          {f.tradeoffs.map((t, i) => (
            <div key={i} className="grid sm:grid-cols-2 gap-3">
              <div className="flex gap-3 rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4">
                <span className="text-emerald-500 shrink-0 mt-0.5">+</span>
                <p className="text-sm text-zinc-300 leading-snug">{t.pro}</p>
              </div>
              <div className="flex gap-3 rounded-xl border border-red-900/50 bg-red-950/20 p-4">
                <span className="text-red-500 shrink-0 mt-0.5">−</span>
                <p className="text-sm text-zinc-300 leading-snug">{t.con}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* When to use / not */}
      <section className="grid sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h3 className="font-semibold text-emerald-400 text-sm flex items-center gap-2">
            <span>✓</span> When to use
          </h3>
          <ul className="flex flex-col gap-2">
            {f.whenToUse.map((item, i) => (
              <li key={i} className="text-sm text-zinc-400 leading-snug flex gap-2">
                <span className="text-emerald-600 shrink-0 mt-0.5">→</span>{item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h3 className="font-semibold text-red-400 text-sm flex items-center gap-2">
            <span>✗</span> When NOT to use
          </h3>
          <ul className="flex flex-col gap-2">
            {f.whenNotToUse.map((item, i) => (
              <li key={i} className="text-sm text-zinc-400 leading-snug flex gap-2">
                <span className="text-red-700 shrink-0 mt-0.5">→</span>{item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Setup code */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-white">Implementation</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700 font-mono">TypeScript</span>
        </div>
        <div
          className="rounded-xl border border-zinc-800 overflow-hidden text-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </section>

      {/* Real world */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-white">In production</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {f.realWorld.map(ex => (
            <div key={ex.company} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 flex flex-col gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded border border-zinc-700 text-zinc-400 self-start">
                {ex.company}
              </span>
              <p className="text-sm text-zinc-400 leading-snug">{ex.usage}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Other frameworks */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-white">Other frameworks</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {others.map(o => (
            <Link
              key={o.slug}
              href={`/principles/authentication/${o.slug}`}
              className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-zinc-100 group-hover:text-white transition-colors text-sm">{o.name}</h3>
                <div className="flex gap-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${TYPE_STYLE[o.type]}`}>{o.type}</span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 leading-snug">{o.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Back */}
      <Link
        href="/principles/authentication"
        className="self-start text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5"
      >
        ← Back to Authentication
      </Link>

    </div>
  );
}
