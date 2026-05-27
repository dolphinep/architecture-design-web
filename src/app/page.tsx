import Link from "next/link";
import { principleRegistry, CATEGORY_META } from "@/lib/registry";
import { CategoryBadge, ComplexityBadge, LevelBadge, PopularityStars } from "@/components/ui/Badge";
import { StackOverview } from "@/components/StackOverview";
import type { Category } from "@/types/principle";

const FEATURED_SLUGS = [
  "clean-architecture",
  "microservices",
  "circuit-breaker",
  "event-driven",
  "kubernetes",
  "cdn",
];

const HIGHLIGHTS = [
  {
    icon: "◈",
    title: "Architecture Patterns",
    desc: "Clean Architecture, Microservices, CQRS, Event Sourcing, DDD — each with interactive diagrams and real adoption data.",
    href: "/principles?category=architecture",
    color: "text-violet-400",
  },
  {
    icon: "⬡",
    title: "Infrastructure",
    desc: "Containers, Kubernetes, Service Mesh, Load Balancing — how modern apps are deployed and operated.",
    href: "/principles?category=infrastructure",
    color: "text-cyan-400",
  },
  {
    icon: "☁",
    title: "Cloud Design",
    desc: "Cloud-native principles, serverless, and multi-cloud strategies with real cost/performance trade-offs.",
    href: "/principles?category=cloud",
    color: "text-sky-400",
  },
  {
    icon: "⟳",
    title: "Networking",
    desc: "OSI model, DNS, CDN, and load balancing — the network layer every developer should understand.",
    href: "/principles?category=networking",
    color: "text-emerald-400",
  },
];

const USAGE_MAP: Array<{
  system: string;
  cases: Array<{ description: string; slug: string }>;
}> = [
  {
    system: "Netflix",
    cases: [
      { description: "700+ independent microservices", slug: "microservices" },
      { description: "Hystrix circuit breakers everywhere", slug: "circuit-breaker" },
      { description: "Kafka-powered event streams", slug: "event-driven" },
    ],
  },
  {
    system: "Amazon",
    cases: [
      { description: "Two-pizza teams → microservices", slug: "microservices" },
      { description: "Saga-based order processing", slug: "saga-pattern" },
      { description: "API Gateway for all traffic", slug: "api-gateway" },
    ],
  },
  {
    system: "Google",
    cases: [
      { description: "Kubernetes from Borg internals", slug: "kubernetes" },
      { description: "Service mesh via Istio", slug: "service-mesh" },
      { description: "Cloud-native architecture at scale", slug: "cloud-native" },
    ],
  },
  {
    system: "Cloudflare",
    cases: [
      { description: "330+ CDN PoPs globally", slug: "cdn" },
      { description: "L3/L4 + L7 DDoS via OSI layers", slug: "osi-model" },
      { description: "Anycast DNS at 1T+ queries/day", slug: "dns" },
    ],
  },
];

export default function HomePage() {
  const featured = FEATURED_SLUGS.map((s) => principleRegistry.find((p) => p.slug === s)).filter(Boolean);
  const implemented = principleRegistry.filter((p) => p.implemented).length;
  const byCategory = Object.entries(
    principleRegistry.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    }, {})
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-16 flex flex-col gap-20">

      {/* Hero */}
      <section className="flex flex-col items-center text-center gap-6 pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          {implemented} interactive visualizations · {principleRegistry.length} principles
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white max-w-3xl leading-tight">
          Understand architecture,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
            visually
          </span>
        </h1>

        <p className="text-lg text-zinc-400 max-w-2xl">
          Interactive diagrams, real-world adoption data, and honest trade-offs for the architecture patterns,
          infrastructure concepts, and networking fundamentals every developer should know.
        </p>

        <div className="flex gap-3 flex-wrap justify-center">
          <Link
            href="/principles"
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors text-sm"
          >
            Browse all principles
          </Link>
          <Link
            href="/principles/clean-architecture"
            className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium transition-colors text-sm border border-zinc-700"
          >
            Try Clean Architecture →
          </Link>
          <Link
            href="/canvas"
            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-medium transition-colors text-sm border border-zinc-800 hover:border-zinc-700"
          >
            ✏ Draw diagrams
          </Link>
        </div>
      </section>

      {/* Category overview */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {HIGHLIGHTS.map(({ icon, title, desc, href, color }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all flex flex-col gap-3"
          >
            <span className={`text-2xl ${color}`}>{icon}</span>
            <h3 className="font-semibold text-zinc-100 group-hover:text-white transition-colors">{title}</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
            <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors mt-auto">
              Explore →
            </span>
          </Link>
        ))}
      </section>

      {/* Stack map */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Where each pattern lives in the stack</h2>
          <p className="text-sm text-zinc-500 mt-1">Patterns operate at different levels — from code structure to global networking.</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5">
          <StackOverview />
        </div>
      </section>

      {/* Featured principles */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Featured principles</h2>
            <p className="text-sm text-zinc-500 mt-1">The patterns most used in production systems today.</p>
          </div>
          <Link href="/principles" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            View all →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map((p) => {
            if (!p) return null;
            const meta = CATEGORY_META[p.category as Category];
            return (
              <Link
                key={p.slug}
                href={`/principles/${p.slug}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${meta.color.split(" ")[1]}`}>{meta.icon}</span>
                    <h3 className="font-semibold text-zinc-100 group-hover:text-white transition-colors">
                      {p.name}
                    </h3>
                  </div>
                  {p.implemented && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/20">
                      Live
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-500 leading-relaxed">{p.summary}</p>
                <div className="flex flex-wrap gap-2 mt-auto pt-2 items-center">
                  <LevelBadge level={p.level} />
                  <CategoryBadge category={p.category} />
                  <ComplexityBadge complexity={p.complexity} />
                  <span className="ml-auto">
                    <PopularityStars value={p.popularity} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Where they're used */}
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Where these patterns run in production</h2>
          <p className="text-sm text-zinc-500 mt-1">Real companies, real usage — not just textbook examples.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {USAGE_MAP.map(({ system, cases }) => (
            <div key={system} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 flex flex-col gap-3">
              <span className="self-start text-xs font-mono px-2 py-0.5 rounded border border-zinc-700 text-zinc-400">
                {system}
              </span>
              <ul className="flex flex-col gap-2.5">
                {cases.map(({ description, slug }) => {
                  const principle = principleRegistry.find((p) => p.slug === slug);
                  return (
                    <li key={`${system}-${slug}`} className="flex items-start gap-2 text-sm">
                      <span className="text-zinc-600 mt-0.5 shrink-0">→</span>
                      <div>
                        <span className="text-zinc-400 leading-snug">{description}</span>
                        <Link
                          href={`/principles/${slug}`}
                          className="block text-xs text-violet-400 hover:text-violet-300 transition-colors mt-0.5"
                        >
                          {principle?.name ?? slug}
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Canvas CTA */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 flex flex-col sm:flex-row items-center gap-8">
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="text-violet-400 text-lg">✏</span>
            <h2 className="text-xl font-semibold text-white">Draw your own architecture</h2>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">
            Sketch diagrams with pre-built architecture shapes — services, databases, queues, gateways, and more. Save up to 20 canvases in your browser and export as PNG or JSON.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 font-mono mt-1">
            <span>10 shape types</span>
            <span>4 starter templates</span>
            <span>local save · ⌘S</span>
            <span>PNG + JSON export</span>
          </div>
        </div>
        <Link
          href="/canvas"
          className="shrink-0 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors text-sm whitespace-nowrap"
        >
          Open canvas →
        </Link>
      </section>

      {/* What you get */}
      <section className="flex flex-col gap-8">
        <h2 className="text-xl font-semibold text-white">Everything you need to understand a pattern</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: "◈", title: "Interactive visualization", desc: "Animated diagrams — not static images. Click, step through, and explore how each pattern works at runtime." },
            { icon: "★", title: "Popularity rating", desc: "1–5 star industry adoption score. Know which patterns are everywhere and which are niche." },
            { icon: "⇄", title: "Honest trade-offs", desc: "Every pattern has a cost. Pros and cons written for real decisions, not textbook completeness." },
            { icon: "→", title: "When to use (and not)", desc: "Explicit guidance on where a pattern shines and where it's overkill or wrong." },
            { icon: "⬡", title: "Real-world examples", desc: "Netflix, Amazon, Google — where each pattern actually runs, with context about why." },
            { icon: "↔", title: "Related patterns", desc: "Patterns connect. Understand how Clean Architecture, DDD, CQRS, and Event Sourcing form a coherent whole." },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex flex-col gap-2">
              <div className="text-2xl font-mono text-violet-400">{icon}</div>
              <h3 className="font-semibold text-zinc-100">{title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
