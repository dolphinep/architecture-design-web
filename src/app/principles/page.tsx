"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { principleRegistry, CATEGORIES, LEVELS, LEVEL_META, GROUP_META, GROUP_ORDER } from "@/lib/registry";
import { CategoryBadge, ComplexityBadge, LevelBadge, PopularityStars } from "@/components/ui/Badge";
import { StackOverview } from "@/components/StackOverview";
import type { Level } from "@/types/principle";

function PrinciplesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // All filter state lives in the URL so it survives navigation
  const category = searchParams.get("category") ?? "all";
  const level    = (searchParams.get("level") ?? "all") as Level | "all";
  const view     = (searchParams.get("view") ?? "grid") as "grid" | "stack";
  const search   = searchParams.get("q") ?? "";

  // Local state only for the text input to keep it responsive
  const [searchInput, setSearchInput] = useState(search);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const isDefault = value === "all" || value === "" || (key === "view" && value === "grid");
    if (isDefault) { params.delete(key); } else { params.set(key, value); }
    const qs = params.toString();
    router.replace(qs ? `/principles?${qs}` : "/principles", { scroll: false });
  }

  const filtered = principleRegistry.filter((p) => {
    const matchCat   = category === "all" || p.category === category;
    const matchLevel = level    === "all" || p.level    === level;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q));
    return matchCat && matchLevel && matchSearch;
  });

  const popularFirst = [...filtered].sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name));

  // Build group sections — grouped principles appear under labelled headers,
  // ungrouped (system/infra/cloud/network) render below without a header.
  const hasGroups = popularFirst.some((p) => p.group);
  type Section = { key: string; label?: string; description?: string; items: typeof popularFirst };
  const sections: Section[] = (() => {
    if (!hasGroups) return [{ key: "__all", items: popularFirst }];
    const map = new Map<string, typeof popularFirst>();
    const ungrouped: typeof popularFirst = [];
    for (const p of popularFirst) {
      if (p.group) {
        if (!map.has(p.group)) map.set(p.group, []);
        map.get(p.group)!.push(p);
      } else {
        ungrouped.push(p);
      }
    }
    const result: Section[] = [];
    for (const g of GROUP_ORDER) {
      if (map.has(g)) {
        result.push({ key: g, label: GROUP_META[g]?.label, description: GROUP_META[g]?.description, items: map.get(g)! });
      }
    }
    // Any group not in GROUP_ORDER (future-proof)
    for (const [g, items] of map) {
      if (!GROUP_ORDER.includes(g as typeof GROUP_ORDER[number])) {
        result.push({ key: g, label: GROUP_META[g]?.label, items });
      }
    }
    if (ungrouped.length > 0) result.push({ key: "__other", items: ungrouped });
    return result;
  })();

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">All Principles</h1>
        <p className="text-zinc-400">
          {principleRegistry.length} patterns — filter by what layer of the stack they operate at.
        </p>
      </header>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-600">View as:</span>
        {([
          { value: "grid",  label: "Grid" },
          { value: "stack", label: "Stack map" },
        ] as const).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateParam("view", value)}
            className={`px-3 py-1 rounded-lg text-xs border transition-colors ${
              view === value
                ? "bg-zinc-700 border-zinc-500 text-white"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stack map view */}
      {view === "stack" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Where each pattern operates in the stack</h2>
          <StackOverview />
        </div>
      )}

      {/* Filters (grid view) */}
      {view === "grid" && (
        <div className="flex flex-col gap-3">
          {/* Category filter */}
          <div className="flex gap-1 flex-wrap items-center">
            <span className="text-xs text-zinc-600 mr-1">Category:</span>
            {CATEGORIES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => updateParam("category", value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  category === value
                    ? "bg-violet-600 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Level filter */}
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-zinc-600 mr-1">Level:</span>
            <button
              onClick={() => updateParam("level", "all")}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                level === "all"
                  ? "bg-zinc-700 border-zinc-500 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              All levels
            </button>
            {LEVELS.map((l) => {
              const meta = LEVEL_META[l.value];
              const isActive = level === l.value;
              return (
                <button
                  key={l.value}
                  onClick={() => updateParam("level", isActive ? "all" : l.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                    isActive
                      ? `${meta.bg} ${meta.border} ${meta.color}`
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <span className="font-mono mr-1 opacity-60">{l.icon}</span>
                  {l.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="flex justify-end">
            <input
              type="search"
              placeholder="Search patterns..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                updateParam("q", e.target.value);
              }}
              className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 w-full sm:w-56"
            />
          </div>
        </div>
      )}

      {/* Active level context banner */}
      {level !== "all" && view === "grid" && (
        <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${LEVEL_META[level].bg} ${LEVEL_META[level].border}`}>
          <span className={`font-mono text-lg ${LEVEL_META[level].color}`}>
            {LEVELS.find((l) => l.value === level)?.icon}
          </span>
          <div>
            <span className={`text-sm font-semibold ${LEVEL_META[level].color}`}>
              {LEVELS.find((l) => l.value === level)?.label} level
            </span>
            <span className="text-sm text-zinc-400 ml-2">
              — {LEVEL_META[level].desc}
            </span>
          </div>
          <span className={`ml-auto text-xs font-mono ${LEVEL_META[level].color}`}>
            {popularFirst.length} pattern{popularFirst.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Grid */}
      {view === "grid" && (
        popularFirst.length === 0 ? (
          <p className="text-zinc-500 py-8 text-center">No principles match your filters.</p>
        ) : (
          <div className="flex flex-col gap-8">
            {sections.map((section) => (
              <div key={section.key}>
                {section.label && (
                  <div className="mb-4">
                    <h2 className="text-sm font-semibold text-zinc-300">{section.label}</h2>
                    {section.description && (
                      <p className="text-xs text-zinc-600 mt-0.5">{section.description}</p>
                    )}
                  </div>
                )}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.items.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/principles/${p.slug}`}
                      className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-zinc-100 group-hover:text-white transition-colors leading-snug">
                          {p.name}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {p.implemented && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/20">
                              Live
                            </span>
                          )}
                          {p.year && (
                            <span className="text-[10px] text-zinc-600 font-mono">{p.year}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-zinc-500 leading-relaxed">{p.summary}</p>
                      <div className="flex flex-wrap gap-2 mt-auto pt-2 items-center">
                        <LevelBadge level={p.level} />
                        <CategoryBadge category={p.category} />
                        <ComplexityBadge complexity={p.complexity} />
                      </div>
                      <PopularityStars value={p.popularity} />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

export default function PrinciplesPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-10 text-zinc-500">Loading…</div>}>
      <PrinciplesContent />
    </Suspense>
  );
}
