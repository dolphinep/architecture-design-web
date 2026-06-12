"use client";

import { useState } from "react";
import { AnimPauseContext } from "./pause-context";

/**
 * Wraps a slide animation with a pause/play control.
 * - Provides paused state via context (components skip their timer ticks)
 * - Freezes all CSS animations in the subtree while paused
 */
export function AnimationFrame({ children }: { children: React.ReactNode }) {
  const [paused, setPaused] = useState(false);

  return (
    <AnimPauseContext.Provider value={paused}>
      <div className="relative">
        <div className={paused ? "[&_*]:[animation-play-state:paused] [&_*]:![transition-duration:0s]" : ""}>
          {children}
        </div>

        <button
          onClick={() => setPaused((p) => !p)}
          title={paused ? "Resume animation" : "Pause animation"}
          className="absolute top-3 right-3 w-7 h-7 rounded-lg border border-zinc-700/80 bg-zinc-900/80 backdrop-blur-sm text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors flex items-center justify-center text-[10px]"
        >
          {paused ? "▶" : "⏸"}
        </button>

        {paused && (
          <span className="absolute top-3 right-12 px-2 py-1 rounded-md bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 text-[10px] text-zinc-500 font-mono">
            paused
          </span>
        )}
      </div>
    </AnimPauseContext.Provider>
  );
}
