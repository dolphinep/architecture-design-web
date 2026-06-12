"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

interface Tier {
  name: string;
  border: string;
  activeBorder: string;
  bg: string;
  text: string;
  dot: string;
  caption: string;
  latency: string;
}

const TIERS: Tier[] = [
  {
    name: "Browser / CDN",
    border: "border-amber-500/30",
    activeBorder: "border-amber-400",
    bg: "bg-amber-950/30",
    text: "text-amber-400",
    dot: "bg-amber-400",
    caption: "closest to the user — zero server cost, but you don't control it",
    latency: "edge hit",
  },
  {
    name: "App server",
    border: "border-violet-500/30",
    activeBorder: "border-violet-400",
    bg: "bg-violet-950/30",
    text: "text-violet-400",
    dot: "bg-violet-400",
    caption: "~100ns — fastest, but per-instance and dies with the process",
    latency: "~100ns",
  },
  {
    name: "Redis (shared)",
    border: "border-emerald-500/30",
    activeBorder: "border-emerald-400",
    bg: "bg-emerald-950/30",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    caption: "~1ms — shared by all instances, survives restarts",
    latency: "~1ms",
  },
  {
    name: "Database",
    border: "border-cyan-500/30",
    activeBorder: "border-cyan-400",
    bg: "bg-cyan-950/30",
    text: "text-cyan-400",
    dot: "bg-cyan-400",
    caption: "~10ms+ — the thing we're protecting",
    latency: "~10ms+",
  },
];

// horizontal center of each tier column (grid-cols-4)
const TIER_X = [12.5, 37.5, 62.5, 87.5];
const CYCLE_MS = 2500;

export function CacheOptionsViz() {
  const [active, setActive] = useState(0);
  const [packetX, setPacketX] = useState(-2);
  const [moving, setMoving] = useState(false);
  const [served, setServed] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const idx = useRef(0);
  const pausedRef = useAnimPausedRef();

  useEffect(() => {
    // setTimeout that, if paused when it fires, re-polls every 100ms until unpaused
    const schedule = (fn: () => void, ms: number) => {
      const cb = () => {
        if (pausedRef.current) {
          timers.current.push(setTimeout(cb, 100));
          return;
        }
        fn();
      };
      timers.current.push(setTimeout(cb, ms));
    };

    const runCycle = () => {
      if (pausedRef.current) return;
      const i = idx.current % TIERS.length;
      idx.current += 1;
      setActive(i);
      setServed(false);
      setMoving(false);
      setPacketX(-2);
      schedule(() => {
        setMoving(true);
        setPacketX(TIER_X[i]);
      }, 80);
      schedule(() => setServed(true), 1050);
    };

    runCycle();
    const id = setInterval(runCycle, CYCLE_MS);
    return () => {
      clearInterval(id);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [pausedRef]);

  const tier = TIERS[active];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      {/* Header */}
      <div className="mb-3">
        <span className="font-mono text-xs font-bold text-zinc-300">
          Where can a cache live?{" "}
          <span className="text-zinc-600 font-normal">
            — four tiers between the user and the database
          </span>
        </span>
      </div>

      {/* Packet track */}
      <div className="relative h-7 mb-1">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-zinc-800" />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
          style={{
            left: `${packetX}%`,
            transition: moving ? "left 0.9s ease-in-out" : "none",
          }}
        >
          <div className={`w-2.5 h-2.5 rounded-full ${tier.dot} shadow`} />
          {/* latency chip */}
          <div
            className={`absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap transition-opacity duration-300 ${
              tier.activeBorder
            } ${tier.bg} ${tier.text} ${served ? "opacity-100" : "opacity-0"}`}
          >
            {tier.latency}
          </div>
        </div>
        <span className="absolute left-0 -top-1 text-[10px] text-zinc-600">
          request →
        </span>
      </div>

      {/* Tier row */}
      <div className="grid grid-cols-4 gap-3">
        {TIERS.map((t, i) => {
          const isActive = i === active;
          return (
            <div
              key={t.name}
              className={`rounded-lg border p-2 h-[72px] flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
                isActive
                  ? `${t.activeBorder} ${t.bg} scale-105`
                  : "border-zinc-800 bg-zinc-900/40"
              }`}
            >
              <span
                className={`font-mono text-[10px] font-bold text-center leading-tight ${
                  isActive ? t.text : "text-zinc-400"
                }`}
              >
                {t.name}
              </span>
              {i === 1 && (
                <span
                  className={`font-mono text-[9px] px-1.5 py-0.5 rounded border transition-colors duration-300 ${
                    isActive
                      ? "border-violet-400/60 bg-violet-950/60 text-violet-300"
                      : "border-zinc-700 bg-zinc-900 text-zinc-500"
                  }`}
                >
                  in-process cache
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Many app instances → one Redis */}
      <div className="mt-2 grid grid-cols-4 gap-3">
        <div />
        <div className="col-span-2 flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <div className="flex flex-col gap-0.5">
              {["app #1", "app #2", "app #3"].map((label) => (
                <span
                  key={label}
                  className="font-mono text-[8px] px-1 py-px rounded border border-violet-500/40 bg-violet-950/30 text-violet-400"
                >
                  {label}
                </span>
              ))}
            </div>
            <svg width="36" height="42" className="shrink-0">
              <line x1="0" y1="8" x2="36" y2="21" stroke="#3f3f46" strokeWidth="1" />
              <line x1="0" y1="21" x2="36" y2="21" stroke="#3f3f46" strokeWidth="1" />
              <line x1="0" y1="34" x2="36" y2="21" stroke="#3f3f46" strokeWidth="1" />
            </svg>
            <span className="font-mono text-[9px] px-1.5 py-1 rounded border border-emerald-500/50 bg-emerald-950/40 text-emerald-400">
              one Redis
            </span>
          </div>
          <span className="text-[9px] text-zinc-600 mt-0.5">
            many instances → one shared cache
          </span>
        </div>
        <div />
      </div>

      {/* Caption */}
      <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 h-9 flex items-center">
        <span className={`font-mono text-xs ${tier.text}`}>
          {tier.name}: <span className="text-zinc-400">{tier.caption}</span>
        </span>
      </div>
    </div>
  );
}
