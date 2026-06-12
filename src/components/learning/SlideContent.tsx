"use client";

import type { JSX } from "react";
import type { SlideBlock, Accent } from "@/types/lesson";

const ACCENT: Record<Accent, { text: string; border: string; bg: string; chip: string }> = {
  violet:  { text: "text-violet-400",  border: "border-violet-500/25",  bg: "bg-violet-500/5",  chip: "bg-violet-500/15 text-violet-300 border-violet-500/25" },
  emerald: { text: "text-emerald-400", border: "border-emerald-500/25", bg: "bg-emerald-500/5", chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" },
  cyan:    { text: "text-cyan-400",    border: "border-cyan-500/25",    bg: "bg-cyan-500/5",    chip: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25" },
  amber:   { text: "text-amber-400",   border: "border-amber-500/25",   bg: "bg-amber-500/5",   chip: "bg-amber-500/15 text-amber-300 border-amber-500/25" },
  red:     { text: "text-red-400",     border: "border-red-500/25",     bg: "bg-red-500/5",     chip: "bg-red-500/15 text-red-300 border-red-500/25" },
  zinc:    { text: "text-zinc-400",    border: "border-zinc-700",       bg: "bg-zinc-900/40",   chip: "bg-zinc-800 text-zinc-300 border-zinc-700" },
};

/** Renders **bold** as bright text and `code` as a mono chip */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-zinc-100">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="font-mono text-[0.85em] text-violet-300 bg-violet-500/10 border border-violet-500/15 rounded px-1 py-px"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function SlideContent({ blocks }: { blocks: SlideBlock[] }): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, bi) => {
        switch (block.kind) {
          case "text":
            return (
              <p key={bi} className="text-zinc-400 leading-relaxed">
                <Inline text={block.text} />
              </p>
            );

          case "points":
            return (
              <ul key={bi} className="flex flex-col gap-2.5">
                {block.items.map((item, i) => {
                  const accent = ACCENT[item.accent ?? "violet"];
                  return (
                    <li key={i} className="flex items-start gap-3">
                      {item.label ? (
                        <span
                          className={`shrink-0 font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border mt-0.5 min-w-[3.5rem] text-center ${accent.chip}`}
                        >
                          {item.label}
                        </span>
                      ) : (
                        <span className={`shrink-0 mt-1 text-xs ${accent.text}`}>▸</span>
                      )}
                      <span className="text-sm text-zinc-400 leading-relaxed">
                        <Inline text={item.text} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            );

          case "stats":
            return (
              <div
                key={bi}
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${block.items.length}, minmax(0, 1fr))` }}
              >
                {block.items.map((stat, i) => {
                  const accent = ACCENT[stat.accent ?? "violet"];
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border px-3 py-3 text-center ${accent.border} ${accent.bg}`}
                    >
                      <p className={`font-mono font-bold text-lg sm:text-xl ${accent.text}`}>
                        {stat.value}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-1 leading-tight">{stat.label}</p>
                    </div>
                  );
                })}
              </div>
            );

          case "compare":
            return (
              <div
                key={bi}
                className={`grid gap-3 ${block.cards.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
              >
                {block.cards.map((card, i) => {
                  const accent = ACCENT[card.accent];
                  return (
                    <div key={i} className={`rounded-xl border p-4 ${accent.border} ${accent.bg}`}>
                      <p className={`text-sm font-semibold mb-2.5 ${accent.text}`}>{card.title}</p>
                      <ul className="flex flex-col gap-1.5">
                        {card.points.map((point, pi) => (
                          <li key={pi} className="flex items-start gap-2 text-[13px] text-zinc-400 leading-relaxed">
                            <span className={`shrink-0 mt-0.5 text-[10px] ${accent.text}`}>—</span>
                            <span><Inline text={point} /></span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            );

          case "flow":
            return (
              <ol key={bi} className="flex flex-col">
                {block.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 font-mono text-[11px] flex items-center justify-center">
                        {i + 1}
                      </span>
                      {i < block.steps.length - 1 && (
                        <span className="w-px flex-1 min-h-3 bg-zinc-800" />
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed pb-3 pt-0.5">
                      <Inline text={step} />
                    </p>
                  </li>
                ))}
              </ol>
            );
        }
      })}
    </div>
  );
}
