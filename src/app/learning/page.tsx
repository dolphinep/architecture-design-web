import type { Metadata } from "next";
import Link from "next/link";
import type { Lesson } from "@/types/lesson";
import { lessons } from "@/lib/lessons";

export const metadata: Metadata = {
  title: "Learning — arch.design",
  description:
    "Slideshow lessons with animated visualizations — learn caching, Redis, and more, one slide at a time.",
};

const LEVEL_COLOR: Record<string, string> = {
  beginner:     "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  intermediate: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  advanced:     "text-red-400 border-red-500/30 bg-red-500/10",
};

// Module-level visual configuration
const MODULE_META: Record<string, {
  description: string;
  icon: string;
  gradient: string;
  border: string;
  headerBg: string;
  accentText: string;
  badge: string;
}> = {
  "AI Architecture": {
    description: "Build production-ready AI systems — RAG pipelines, vector databases, self-hosted inference, private AI stacks, and tool integration over MCP.",
    icon: "✦",
    gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
    border: "border-amber-500/25",
    headerBg: "bg-amber-500/8",
    accentText: "text-amber-400",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
};

function LessonCard({
  lesson,
  seriesLabel,
  accentOverride,
}: {
  lesson: Lesson;
  seriesLabel?: string;
  accentOverride?: string;
}) {
  return (
    <Link
      href={`/learning/${lesson.slug}`}
      className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {seriesLabel && (
            <p className={`font-mono text-[9px] uppercase tracking-widest mb-1 ${accentOverride ?? "text-violet-400/70"}`}>
              {seriesLabel}
            </p>
          )}
          <h3 className="font-semibold text-base text-zinc-100 group-hover:text-white transition-colors leading-snug">
            {lesson.title}
          </h3>
        </div>
        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border mt-0.5 ${LEVEL_COLOR[lesson.level]}`}>
          {lesson.level}
        </span>
      </div>
      <p className="text-sm text-zinc-500 leading-relaxed">{lesson.description}</p>
      <div className="flex items-center gap-3 mt-auto pt-2 text-xs text-zinc-600 font-mono">
        <span>{lesson.slides.length} slides</span>
        <span>·</span>
        <span>{lesson.duration}</span>
        {lesson.lab && (
          <>
            <span>·</span>
            <span className="text-emerald-500">⚒ lab</span>
          </>
        )}
        <span className={`ml-auto transition-colors ${accentOverride ? "text-amber-400 group-hover:text-amber-300" : "text-violet-400 group-hover:text-violet-300"}`}>
          Start →
        </span>
      </div>
    </Link>
  );
}

function ModuleSection({ name, lessons: group }: { name: string; lessons: Lesson[] }) {
  const meta = MODULE_META[name];

  if (!meta) {
    // Fallback for unknown modules — plain section header
    return (
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest font-mono">{name}</h2>
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="font-mono text-[10px] text-zinc-600">{group.length} lessons</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {group.map((lesson, i) => (
            <LessonCard key={lesson.slug} lesson={lesson} seriesLabel={`${name} · Part ${i + 1}`} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={`rounded-2xl border ${meta.border} bg-gradient-to-br ${meta.gradient} overflow-hidden`}>
      {/* Module header */}
      <div className={`px-6 py-5 border-b ${meta.border} ${meta.headerBg}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`text-2xl ${meta.accentText}`}>{meta.icon}</span>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className={`text-lg font-bold ${meta.accentText}`}>{name}</h2>
                <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wide ${meta.badge}`}>
                  module
                </span>
              </div>
              <p className="text-sm text-zinc-400 max-w-xl">{meta.description}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className={`font-mono text-2xl font-bold ${meta.accentText}`}>{group.length}</div>
            <div className="font-mono text-[10px] text-zinc-600">lessons</div>
          </div>
        </div>

        {/* Tags from all lessons */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {Array.from(new Set(group.flatMap(l => l.tags))).slice(0, 8).map(tag => (
            <span key={tag} className="font-mono text-[9px] px-2 py-0.5 rounded border border-zinc-700/60 bg-zinc-800/40 text-zinc-500">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Lesson cards */}
      <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {group.map((lesson, i) => (
          <LessonCard
            key={lesson.slug}
            lesson={lesson}
            seriesLabel={`Part ${i + 1} of ${group.length}`}
            accentOverride={meta.accentText}
          />
        ))}
      </div>
    </section>
  );
}

export default function LearningPage() {
  // Partition lessons into modules, series, and standalone
  const moduleMap  = new Map<string, Lesson[]>();
  const seriesMap  = new Map<string, Lesson[]>();
  const standalone: Lesson[] = [];

  for (const lesson of lessons) {
    if (lesson.module) {
      const arr = moduleMap.get(lesson.module) ?? [];
      arr.push(lesson);
      moduleMap.set(lesson.module, arr);
    } else if (lesson.series) {
      const arr = seriesMap.get(lesson.series) ?? [];
      arr.push(lesson);
      seriesMap.set(lesson.series, arr);
    } else {
      standalone.push(lesson);
    }
  }

  // Sort within each module/series by order field
  for (const arr of moduleMap.values()) {
    arr.sort((a, b) => (a.moduleOrder ?? 99) - (b.moduleOrder ?? 99));
  }
  for (const arr of seriesMap.values()) {
    arr.sort((a, b) => (a.seriesOrder ?? 99) - (b.seriesOrder ?? 99));
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 flex flex-col gap-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold text-white">Learning</h1>
        <p className="text-zinc-400 max-w-2xl">
          Slideshow lessons with animated visualizations and sequence diagrams. Each slide
          explains one idea — hit{" "}
          <span className="font-mono text-zinc-300 text-sm">Recap</span> for a 30-second
          summary, or{" "}
          <span className="font-mono text-zinc-300 text-sm">⚒ Hands-on</span> to run the
          lab yourself.
        </p>
      </header>

      {/* Featured modules (AI Architecture, etc.) */}
      {Array.from(moduleMap.entries()).map(([name, group]) => (
        <ModuleSection key={name} name={name} lessons={group} />
      ))}

      {/* Standalone lessons */}
      {standalone.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest font-mono">Lessons</h2>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {standalone.map((lesson) => (
              <LessonCard key={lesson.slug} lesson={lesson} />
            ))}
          </div>
        </section>
      )}

      {/* Series groups (Authentication, etc.) */}
      {Array.from(seriesMap.entries()).map(([seriesName, group]) => (
        <section key={seriesName} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest font-mono">
              {seriesName}
            </h2>
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="font-mono text-[10px] text-zinc-600">{group.length} lessons</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {group.map((lesson, i) => (
              <LessonCard
                key={lesson.slug}
                lesson={lesson}
                seriesLabel={`Part ${i + 1} of ${group.length}`}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Coming soon */}
      <div className="rounded-xl border border-dashed border-zinc-800/60 p-6 flex flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-zinc-600">More lessons coming</p>
        <p className="text-xs text-zinc-700">Agent architectures · Database indexing · WebSockets · gRPC · Observability</p>
      </div>
    </div>
  );
}
