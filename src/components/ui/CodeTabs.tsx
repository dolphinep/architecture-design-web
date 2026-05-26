"use client";
import { useState } from "react";

export interface HighlightedExample {
  language: string;
  label: string;
  html: string;
}

const LANG_TAB: Record<string, string> = {
  typescript: "text-blue-300  border-blue-500/40  bg-blue-500/10",
  go:         "text-cyan-300  border-cyan-500/40  bg-cyan-500/10",
  rust:       "text-orange-300 border-orange-500/40 bg-orange-500/10",
};

interface Props {
  examples: HighlightedExample[];
}

export function CodeTabs({ examples }: Props) {
  const [active, setActive] = useState(0);
  const current = examples[active];

  return (
    <div className="flex flex-col rounded-xl border border-zinc-800 overflow-hidden">

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-zinc-800 bg-zinc-900/60 px-2 pt-2">
        {examples.map((ex, i) => {
          const colors = LANG_TAB[ex.language] ?? "text-zinc-300 border-zinc-600 bg-zinc-800";
          const isActive = i === active;
          return (
            <button
              key={ex.language}
              onClick={() => setActive(i)}
              className={`px-3 py-1.5 text-xs font-mono rounded-t-lg border-t border-l border-r transition-colors -mb-px ${
                isActive
                  ? `${colors} border-b-zinc-950`
                  : "border-transparent text-zinc-500 hover:text-zinc-300 bg-transparent"
              }`}
            >
              {ex.label}
            </button>
          );
        })}
      </div>

      {/* Highlighted code — Shiki HTML rendered server-side */}
      <div className="bg-zinc-950 overflow-x-auto">
        <div
          key={current.language}
          className="
            px-5 py-4
            text-[13px] leading-relaxed
            [&>pre]:bg-transparent [&>pre]:m-0 [&>pre]:p-0
            [&>pre]:font-mono [&>pre]:text-[13px] [&>pre]:leading-relaxed
            [&>pre>code]:font-[inherit]
            [&_.line]:min-h-[1.5em]
          "
          dangerouslySetInnerHTML={{ __html: current.html }}
        />
      </div>

    </div>
  );
}
