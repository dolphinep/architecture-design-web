import { notFound } from "next/navigation";
import Link from "next/link";
import { principleRegistry, CATEGORY_META, LEVEL_META, LEVELS } from "@/lib/registry";
import { codeExamples } from "@/lib/code-examples";
import { highlightCode } from "@/lib/highlight";
import { CategoryBadge, ComplexityBadge, LevelBadge, PopularityStars } from "@/components/ui/Badge";
import { CodeTabs } from "@/components/ui/CodeTabs";
import { ProjectStructureBlock } from "@/components/ProjectStructureBlock";
import type { CodeLanguage } from "@/types/principle";
import { CleanArchitectureViz } from "@/components/visualizations/CleanArchitectureViz";
import { MicroservicesViz } from "@/components/visualizations/MicroservicesViz";
import { CircuitBreakerViz } from "@/components/visualizations/CircuitBreakerViz";
import { EventDrivenViz } from "@/components/visualizations/EventDrivenViz";
import { CQRSViz } from "@/components/visualizations/CQRSViz";
import { SagaViz } from "@/components/visualizations/SagaViz";
import { LayeredArchViz } from "@/components/visualizations/LayeredArchViz";
import { KubernetesViz } from "@/components/visualizations/KubernetesViz";
import { DNSViz } from "@/components/visualizations/DNSViz";
import { APIGatewayViz } from "@/components/visualizations/APIGatewayViz";
import { EventSourcingViz } from "@/components/visualizations/EventSourcingViz";
import { ServiceMeshViz } from "@/components/visualizations/ServiceMeshViz";
import { CDNViz } from "@/components/visualizations/CDNViz";
import { LoadBalancingViz } from "@/components/visualizations/LoadBalancingViz";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return principleRegistry.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const p = principleRegistry.find((p) => p.slug === slug);
  if (!p) return {};
  return {
    title: `${p.name} — arch.design`,
    description: p.summary,
  };
}

function Viz({ slug }: { slug: string }) {
  switch (slug) {
    case "clean-architecture": return <CleanArchitectureViz />;
    case "microservices":      return <MicroservicesViz />;
    case "circuit-breaker":    return <CircuitBreakerViz />;
    case "event-driven":       return <EventDrivenViz />;
    case "cqrs":               return <CQRSViz />;
    case "saga-pattern":        return <SagaViz />;
    case "layered-architecture":return <LayeredArchViz />;
    case "kubernetes":          return <KubernetesViz />;
    case "dns":                  return <DNSViz />;
    case "api-gateway":          return <APIGatewayViz />;
    case "event-sourcing":       return <EventSourcingViz />;
    case "service-mesh":         return <ServiceMeshViz />;
    case "cdn":                  return <CDNViz />;
    case "load-balancing":       return <LoadBalancingViz />;
    default:                     return null;
  }
}

export default async function PrinciplePage({ params }: Props) {
  const { slug } = await params;
  const p = principleRegistry.find((p) => p.slug === slug);
  if (!p) notFound();

  const related = p.related
    .map((s) => principleRegistry.find((r) => r.slug === s))
    .filter(Boolean)
    .slice(0, 4);

  const catMeta = CATEGORY_META[p.category];
  const levelMeta = LEVEL_META[p.level];
  const levelDef = LEVELS.find((l) => l.value === p.level);

  // Pre-render syntax highlighting server-side (zero client bundle cost)
  const codeContent = codeExamples[p.slug];
  const highlightedExamples = codeContent?.examples?.length
    ? await Promise.all(
        codeContent.examples.map(async (ex) => ({
          language: ex.language,
          label: ex.label,
          html: await highlightCode(ex.code, ex.language as CodeLanguage),
        }))
      )
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-12">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/principles" className="hover:text-zinc-300 transition-colors">
          Principles
        </Link>
        <span>/</span>
        <span className="text-zinc-300">{p.name}</span>
      </div>

      {/* Header */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 items-center">
          <LevelBadge level={p.level} />
          <CategoryBadge category={p.category} />
          <ComplexityBadge complexity={p.complexity} />
          {p.year && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-500 font-mono">
              {p.year}
            </span>
          )}
          {p.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-500 border border-zinc-800">
              {tag}
            </span>
          ))}
        </div>
        <h1 className="text-4xl font-bold text-white leading-tight">{p.name}</h1>
        <p className="text-lg text-zinc-400 leading-relaxed">{p.summary}</p>
        <PopularityStars value={p.popularity} />
      </header>

      {/* Level context */}
      <div className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${levelMeta.bg} ${levelMeta.border}`}>
        <div className="flex items-center gap-3 flex-1">
          <span className={`font-mono text-2xl ${levelMeta.color}`}>{levelDef?.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${levelMeta.color}`}>
                Operates at: {levelDef?.label} level
              </span>
            </div>
            <p className={`text-xs mt-0.5 opacity-80 ${levelMeta.color}`}>
              {levelDef?.desc}
            </p>
          </div>
        </div>
        {/* Mini stack indicator */}
        <div className="flex items-center gap-1 sm:gap-0.5 shrink-0">
          {[...LEVELS].reverse().map((l) => {
            const isThis = l.value === p.level;
            const lm = LEVEL_META[l.value];
            return (
              <Link
                key={l.value}
                href={`/principles?level=${l.value}&view=stack`}
                title={`${l.label} level`}
                className={`flex items-center justify-center rounded text-[9px] font-mono px-1.5 py-0.5 border transition-colors ${
                  isThis
                    ? `${lm.bg} ${lm.border} ${lm.color} font-bold`
                    : "border-zinc-800 text-zinc-700 hover:text-zinc-400"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Interactive Visualization */}
      {p.implemented && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-white">Interactive visualization</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/20">
              Live
            </span>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <Viz slug={p.slug} />
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-white">How it works</h2>
        <div className="text-zinc-400 leading-relaxed flex flex-col gap-3">
          {p.description.split("\n\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>

      {/* Project structure */}
      {codeExamples[p.slug]?.projectStructure && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-white">Project structure</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700 font-mono">
              recommended layout
            </span>
          </div>
          <ProjectStructureBlock tree={codeExamples[p.slug].projectStructure} />
        </section>
      )}

      {/* Code examples */}
      {highlightedExamples.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-white">Implementation</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700 font-mono">
              TypeScript · Go · Rust
            </span>
          </div>
          <CodeTabs examples={highlightedExamples} />
        </section>
      )}

      {/* Why it matters */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-white">Why it matters</h2>
        <div className={`rounded-xl border p-4 ${catMeta.color.split(" ").slice(0,2).join(" ")} ${catMeta.color.split(" ")[2]}`}>
          <p className="text-sm leading-relaxed">{p.whyItMatters}</p>
        </div>
      </section>

      {/* When to use / not */}
      <section className="grid sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h3 className="font-semibold text-emerald-400 text-sm flex items-center gap-2">
            <span>✓</span> When to use
          </h3>
          <ul className="flex flex-col gap-2">
            {p.whenToUse.map((item, i) => (
              <li key={i} className="text-sm text-zinc-400 leading-snug flex gap-2">
                <span className="text-emerald-600 shrink-0 mt-0.5">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h3 className="font-semibold text-red-400 text-sm flex items-center gap-2">
            <span>✗</span> When NOT to use
          </h3>
          <ul className="flex flex-col gap-2">
            {p.whenNotToUse.map((item, i) => (
              <li key={i} className="text-sm text-zinc-400 leading-snug flex gap-2">
                <span className="text-red-700 shrink-0 mt-0.5">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Trade-offs */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-white">Trade-offs</h2>
        <div className="grid gap-3">
          {p.tradeoffs.map((t, i) => (
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

      {/* Real-world examples */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-white">In production</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {p.realWorld.map((ex) => (
            <div key={ex.company} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 flex flex-col gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded border border-zinc-700 text-zinc-400 self-start">
                {ex.company}
              </span>
              <p className="text-sm text-zinc-400 leading-snug">{ex.usage}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Popularity context */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-white">Industry adoption</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <PopularityStars value={p.popularity} />
            <span className="text-sm text-zinc-500">
              {p.popularity === 5 && "Ubiquitous — used at virtually every scale-focused company."}
              {p.popularity === 4 && "Widely adopted — mainstream at medium-to-large engineering orgs."}
              {p.popularity === 3 && "Common in specific contexts — used when the problem fits."}
              {p.popularity === 2 && "Niche — valuable but requires specific conditions."}
              {p.popularity === 1 && "Rare — rarely seen outside academic or very specific domains."}
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
              style={{ width: `${p.popularity * 20}%` }}
            />
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-white">Related principles</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {related.map((r) => {
              if (!r) return null;
              return (
                <Link
                  key={r.slug}
                  href={`/principles/${r.slug}`}
                  className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-zinc-100 group-hover:text-white transition-colors text-sm">
                      {r.name}
                    </h3>
                    {r.implemented && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/20">
                        Live
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 leading-snug">{r.summary}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CategoryBadge category={r.category} />
                    <PopularityStars value={r.popularity} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
