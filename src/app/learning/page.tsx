import type { Metadata } from "next";
import Link from "next/link";
import { lessons } from "@/lib/lessons";

export const metadata: Metadata = {
  title: "Learning — arch.design",
  description:
    "Slideshow lessons with animated visualizations — learn caching, Redis, and more, one slide at a time.",
};

const LEVEL_COLOR: Record<string, string> = {
  beginner: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  intermediate: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  advanced: "text-red-400 border-red-500/30 bg-red-500/10",
};

export default function LearningPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold text-white">Learning</h1>
        <p className="text-zinc-400 max-w-2xl">
          Short slideshow lessons with animated visualizations. Each slide animates one idea —
          or hit <span className="font-mono text-zinc-300 text-sm">Recap</span> for the whole
          lesson in 30 seconds.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        {lessons.map((lesson) => (
          <Link
            key={lesson.slug}
            href={`/learning/${lesson.slug}`}
            className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-lg text-zinc-100 group-hover:text-white transition-colors">
                {lesson.title}
              </h2>
              <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${LEVEL_COLOR[lesson.level]}`}>
                {lesson.level}
              </span>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">{lesson.description}</p>
            <div className="flex items-center gap-3 mt-auto pt-2 text-xs text-zinc-600 font-mono">
              <span>{lesson.slides.length} slides</span>
              <span>·</span>
              <span>{lesson.duration}</span>
              <span className="ml-auto text-violet-400 group-hover:text-violet-300 transition-colors">
                Start →
              </span>
            </div>
          </Link>
        ))}

        {/* Coming soon placeholder */}
        <div className="rounded-xl border border-dashed border-zinc-800/60 p-6 flex flex-col items-center justify-center gap-2 text-center min-h-[140px]">
          <p className="text-sm text-zinc-600">More lessons coming</p>
          <p className="text-xs text-zinc-700">Load balancing · Message queues · Database indexing</p>
        </div>
      </div>
    </div>
  );
}
