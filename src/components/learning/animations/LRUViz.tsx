"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

type Step =
  | { op: "get"; key: string }
  | { op: "set"; key: string }
  | { op: "reset" };

const CAPACITY = 4;
const INITIAL_CACHE = ["B", "D", "A", "C"];

const SCRIPT: Step[] = [
  { op: "get", key: "A" },
  { op: "get", key: "C" },
  { op: "set", key: "E" },
  { op: "get", key: "B" },
  { op: "reset" },
];

const CHIP_STYLE: Record<string, { border: string; bg: string; text: string }> = {
  A: { border: "border-violet-500", bg: "bg-violet-950/60", text: "text-violet-400" },
  B: { border: "border-cyan-500", bg: "bg-cyan-950/60", text: "text-cyan-400" },
  C: { border: "border-amber-500", bg: "bg-amber-950/60", text: "text-amber-400" },
  D: { border: "border-red-500", bg: "bg-red-950/60", text: "text-red-400" },
  E: { border: "border-emerald-500", bg: "bg-emerald-950/60", text: "text-emerald-400" },
};

const STEP_MS = 2200;
const EVICT_DELAY_MS = 800;

export function LRUViz() {
  const [cache, setCache] = useState<string[]>(INITIAL_CACHE);
  const [message, setMessage] = useState("Cache full at 4/4 — watching access order…");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [evicting, setEvicting] = useState<string | null>(null);
  const [evictedLabel, setEvictedLabel] = useState<string | null>(null);
  const [inserted, setInserted] = useState<string | null>(null);

  const cacheRef = useRef<string[]>(INITIAL_CACHE);
  const stepIdx = useRef(0);
  const evictTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useAnimPausedRef();

  useEffect(() => {
    const runStep = () => {
      if (pausedRef.current) return;
      const step = SCRIPT[stepIdx.current % SCRIPT.length];
      stepIdx.current += 1;
      setHighlight(null);
      setInserted(null);
      setEvictedLabel(null);

      if (step.op === "get") {
        const next = [step.key, ...cacheRef.current.filter((k) => k !== step.key)];
        cacheRef.current = next;
        setCache(next);
        setHighlight(step.key);
        setMessage(`GET ${step.key} — ${step.key} accessed, moved to front`);
      } else if (step.op === "set") {
        const victim = cacheRef.current[cacheRef.current.length - 1];
        setEvicting(victim);
        setMessage(
          `SET ${step.key} — cache full, ${victim} was least recently used → evicted`
        );
        const fireEvict = () => {
          if (pausedRef.current) {
            // don't drop the chain — re-poll until unpaused
            evictTimer.current = setTimeout(fireEvict, 100);
            return;
          }
          const next = [step.key, ...cacheRef.current.filter((k) => k !== victim)];
          cacheRef.current = next;
          setCache(next);
          setEvicting(null);
          setEvictedLabel(victim);
          setInserted(step.key);
        };
        evictTimer.current = setTimeout(fireEvict, EVICT_DELAY_MS);
      } else {
        cacheRef.current = INITIAL_CACHE;
        setCache(INITIAL_CACHE);
        setEvicting(null);
        setMessage("— new cycle: cache reset to B, D, A, C —");
      }
    };

    const id = setInterval(runStep, STEP_MS);
    return () => {
      clearInterval(id);
      if (evictTimer.current) clearTimeout(evictTimer.current);
    };
  }, [pausedRef]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-xs font-bold text-zinc-300">
          LRU cache <span className="text-zinc-600 font-normal">— evict the coldest key</span>
        </span>
        <span
          className={`font-mono text-xs px-2 py-1 rounded border ${
            cache.length >= CAPACITY
              ? "border-amber-500/50 bg-amber-950/40 text-amber-400"
              : "border-zinc-700 bg-zinc-900 text-zinc-400"
          }`}
        >
          capacity {cache.length}/{CAPACITY}
        </span>
      </div>

      {/* Order labels */}
      <div className="flex justify-between text-xs text-zinc-600 mb-1 px-1">
        <span>most recent ←</span>
        <span>→ least recent (next to evict)</span>
      </div>

      {/* Slots + chips */}
      <div className="relative h-20">
        {/* slot outlines */}
        <div className="absolute inset-0 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`rounded-lg border border-dashed ${
                i === 3 ? "border-zinc-700" : "border-zinc-800"
              }`}
            />
          ))}
        </div>
        {/* chips */}
        {cache.map((key, idx) => {
          const style = CHIP_STYLE[key];
          const isEvicting = evicting === key;
          const isHi = highlight === key;
          const isNew = inserted === key;
          return (
            <div
              key={key}
              className="absolute top-0 h-full transition-all duration-500 ease-in-out"
              style={{ left: `${idx * 25}%`, width: "25%" }}
            >
              <div
                className={`m-1 h-[calc(100%-8px)] rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all duration-300 ${
                  isEvicting
                    ? "border-red-500 bg-red-950/80 opacity-60 translate-y-2"
                    : `${style.border} ${style.bg}`
                } ${isHi ? "ring-2 ring-violet-400/60 scale-105" : ""} ${
                  isNew ? "ring-2 ring-emerald-400/60" : ""
                }`}
              >
                <span
                  className={`font-mono text-lg font-bold ${
                    isEvicting ? "text-red-400" : style.text
                  }`}
                >
                  {key}
                </span>
                {isEvicting && (
                  <span className="font-mono text-[10px] text-red-400">evicting…</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Evicted label row */}
      <div className="h-5 mt-1 flex justify-end pr-1">
        {(evicting !== null || evictedLabel !== null) && (
          <span className="font-mono text-xs text-red-400">
            ✗ {evicting ?? evictedLabel} evicted (LRU)
          </span>
        )}
      </div>

      {/* Explanation line */}
      <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
        <span className="font-mono text-xs text-zinc-400">{message}</span>
      </div>
    </div>
  );
}
