"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

const TICK_MS = 80;
const SPAWN_GAP = 14;
const CYCLE = 200;
const MAX_PER_PART = 5;

interface InFlight {
  id: number;
  keyIdx: number;
  partition: number;
  progress: number; // 0..1
}

const KEY_DEFS = [
  { key: "user-A",   partition: 0, color: "#a78bfa", text: "text-violet-400", border: "border-violet-500/60", bg: "bg-violet-950/30" },
  { key: "order-1",  partition: 1, color: "#22d3ee", text: "text-cyan-400",   border: "border-cyan-500/60",   bg: "bg-cyan-950/30"   },
  { key: "user-B",   partition: 2, color: "#34d399", text: "text-emerald-400",border: "border-emerald-500/60",bg: "bg-emerald-950/30"},
];
const PART_COLORS = ["border-violet-500/40", "border-cyan-500/40", "border-emerald-500/40"];
const PART_TEXT   = ["text-violet-400", "text-cyan-400", "text-emerald-400"];

export function KafkaPartitionsViz() {
  const [inflight, setInflight]     = useState<InFlight[]>([]);
  const [parts, setParts]           = useState<number[]>([0, 0, 0]);
  const [highlight, setHighlight]   = useState(-1);

  const tick       = useRef(0);
  const nextId     = useRef(0);
  const nextKey    = useRef(0);
  const inflightRef= useRef<InFlight[]>([]);
  const partsRef   = useRef<number[]>([0, 0, 0]);
  const pausedRef  = useAnimPausedRef();

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      tick.current = (tick.current + 1) % CYCLE;

      if (tick.current === 0) {
        inflightRef.current = [];
        partsRef.current = [0, 0, 0];
        nextKey.current = 0;
      }

      // spawn
      if (tick.current % SPAWN_GAP === 0) {
        const keyIdx = nextKey.current % KEY_DEFS.length;
        const def = KEY_DEFS[keyIdx];
        if (partsRef.current[def.partition] < MAX_PER_PART) {
          inflightRef.current = [
            ...inflightRef.current,
            { id: nextId.current++, keyIdx, partition: def.partition, progress: 0 },
          ];
          nextKey.current += 1;
        }
      }

      // advance
      const next: InFlight[] = [];
      let hl = -1;
      for (const f of inflightRef.current) {
        const p = f.progress + 0.08;
        if (p >= 1) {
          partsRef.current = partsRef.current.map((v, i) =>
            i === f.partition ? Math.min(MAX_PER_PART, v + 1) : v
          );
          hl = f.partition;
        } else {
          next.push({ ...f, progress: p });
        }
      }
      inflightRef.current = next;

      setInflight([...inflightRef.current]);
      setParts([...partsRef.current]);
      setHighlight(hl);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [pausedRef]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs font-bold text-zinc-300">
          Partitions <span className="text-zinc-600 font-normal">— same key → same partition → ordered</span>
        </span>
      </div>

      <div className="flex gap-3 items-start">
        {/* Producer */}
        <div className="shrink-0 w-20 rounded-xl border border-violet-500/40 bg-violet-950/20 p-2.5">
          <div className="font-mono text-[10px] font-bold text-violet-400 mb-1.5">Producer</div>
          {KEY_DEFS.map(def => (
            <div key={def.key} className="flex items-center gap-1 mb-1">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: def.color }} />
              <span className={`font-mono text-[8px] ${def.text}`}>{def.key}</span>
            </div>
          ))}
          <div className="mt-1.5 font-mono text-[8px] text-zinc-600">hash(key) % 3</div>
        </div>

        {/* Routing area */}
        <div className="flex-1 relative h-28">
          {/* lines from producer to each partition */}
          <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" style={{ opacity: 0.3 }}>
            {[0, 1, 2].map(pi => {
              const y = 14 + pi * 34;
              return (
                <line key={pi} x1="0" y1={y} x2="100%" y2={y}
                  stroke={pi === 0 ? "#a78bfa" : pi === 1 ? "#22d3ee" : "#34d399"}
                  strokeWidth="1" strokeDasharray="3 3" />
              );
            })}
          </svg>

          {/* in-flight dots */}
          {inflight.map(f => {
            const def = KEY_DEFS[f.keyIdx];
            const y = 14 + f.partition * 34;
            const x = f.progress * 100;
            return (
              <div
                key={f.id}
                className="absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ease-linear"
                style={{
                  left: `${x}%`, top: y,
                  background: def.color,
                  boxShadow: `0 0 6px ${def.color}`,
                }}
              />
            );
          })}
        </div>

        {/* Partitions */}
        <div className="shrink-0 w-32 flex flex-col gap-2">
          {[0, 1, 2].map(pi => {
            const def = KEY_DEFS[pi];
            const count = parts[pi];
            const lit = highlight === pi;
            return (
              <div
                key={pi}
                className={`rounded-lg border px-2 py-1.5 transition-colors duration-150 ${
                  lit ? PART_COLORS[pi].replace("/40", "/80") + " " + def.bg : PART_COLORS[pi] + " bg-zinc-900/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-mono text-[9px] font-bold ${PART_TEXT[pi]}`}>P{pi}</span>
                  <span className="font-mono text-[8px] text-zinc-600">{count}/{MAX_PER_PART}</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {Array.from({ length: count }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-sm"
                      style={{ background: def.color, opacity: 0.6 + i * 0.08 }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* key legend */}
      <div className="mt-3 flex gap-4 flex-wrap">
        {KEY_DEFS.map(def => (
          <div key={def.key} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: def.color }} />
            <span className={`font-mono text-[9px] ${def.text}`}>
              {def.key} → P{def.partition}
            </span>
          </div>
        ))}
        <span className="font-mono text-[9px] text-zinc-600 ml-auto">per-partition ordering guaranteed</span>
      </div>

      <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 h-9 flex items-center">
        <span className="font-mono text-xs text-zinc-400">
          same key always routes to same partition — messages within a partition are strictly ordered
        </span>
      </div>
    </div>
  );
}
