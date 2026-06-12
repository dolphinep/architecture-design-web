"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Lesson } from "@/types/lesson";
import { SlideAnimationView } from "./animations";
import { SlideContent } from "./SlideContent";

export function SlidePlayer({ lesson }: { lesson: Lesson }) {
  const [index, setIndex] = useState(0);
  const [summaryMode, setSummaryMode] = useState(false);
  const total = lesson.slides.length;
  const slide = lesson.slides[index];

  const goTo = useCallback(
    (i: number) => setIndex(Math.max(0, Math.min(total - 1, i))),
    [total]
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Keyboard: ← → navigate, S toggles summary mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
      if (e.key === "s" || e.key === "S") setSummaryMode((m) => !m);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/learning"
            className="text-zinc-600 hover:text-zinc-300 transition-colors text-sm shrink-0"
          >
            ← Lessons
          </Link>
          <span className="text-zinc-800">/</span>
          <h1 className="font-semibold text-white truncate">{lesson.title}</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!summaryMode && (
            <span className="text-xs text-zinc-600 font-mono">
              {index + 1} / {total}
            </span>
          )}
          <button
            onClick={() => setSummaryMode((m) => !m)}
            title="Toggle recap (S)"
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              summaryMode
                ? "bg-violet-600 border-violet-500 text-white"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            }`}
          >
            {summaryMode ? "Full lesson" : "Recap"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {!summaryMode && (
        <div className="h-1 rounded-full bg-zinc-900 overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      )}

      {summaryMode ? (
        /* ── Summarize mode — short & precise ── */
        <div className="flex flex-col gap-3">
          <p className="text-xs text-zinc-600 uppercase tracking-widest font-mono">
            {lesson.title} — quick recap
          </p>
          {lesson.slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setSummaryMode(false); goTo(i); }}
              className="group text-left rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all flex gap-3"
            >
              <span className="font-mono text-xs text-violet-400 pt-0.5 shrink-0 w-5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                  {s.title}
                </p>
                <p className="text-sm text-zinc-500 mt-0.5 leading-relaxed">{s.summary}</p>
              </div>
              <span className="ml-auto self-center text-zinc-700 group-hover:text-zinc-500 transition-colors text-xs shrink-0">
                view →
              </span>
            </button>
          ))}
        </div>
      ) : (
        /* ── Full slide mode ── */
        <div key={slide.id} className="flex flex-col gap-5 animate-slide-in">
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            {slide.title}
          </h2>

          {slide.animation && <SlideAnimationView animation={slide.animation} />}

          <SlideContent blocks={slide.body} />

          {/* Subtle takeaway footnote */}
          <div className="flex items-start gap-2.5 pt-3 border-t border-zinc-900">
            <span className="text-violet-400/60 text-xs pt-0.5 shrink-0">★</span>
            <p className="text-[13px] text-zinc-600 leading-relaxed italic">{slide.summary}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      {!summaryMode && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={prev}
            disabled={index === 0}
            className="px-4 py-2 rounded-xl text-sm border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>

          {/* Dots */}
          <div className="flex gap-1.5">
            {lesson.slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                title={s.title}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === index
                    ? "bg-violet-500 scale-125"
                    : i < index
                      ? "bg-zinc-600 hover:bg-zinc-500"
                      : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              />
            ))}
          </div>

          {index === total - 1 ? (
            <Link
              href="/learning"
              className="px-4 py-2 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            >
              Done ✓
            </Link>
          ) : (
            <button
              onClick={next}
              className="px-4 py-2 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            >
              Next →
            </button>
          )}
        </div>
      )}

      {/* Keyboard hint */}
      <p className="text-center text-[10px] text-zinc-700 font-mono">
        ← → navigate · S toggles recap
      </p>
    </div>
  );
}
